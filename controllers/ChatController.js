import {callGeminiAPI, callSimpleGeminiAPI} from '../services/gemini/index.js';
import {syncToDatabase} from '../utils/interactionLogManager.js';
import {ConversationManager} from '../utils/conversationManager.js';
import {constructSystemPrompt} from '../utils/promptManager.js';
import User from '../models/User.js';

const syncToDB = (sessionId, userId, history) =>
    syncToDatabase(sessionId, userId, history).catch(err => console.error(err.message));

const validateMessage = (msg) => msg && typeof msg === 'string';

const getFileData = (file) => file ? {mimeType: file.mimetype, data: file.buffer.toString('base64')} : null;

const manageThinkingMode = async (userId, attemptConsume = false) => {
    const defaultState = {count: 0, lastReset: null};
    if (!userId?.match(/^[0-9a-fA-F]{24}$/)) return {allowed: false, usage: defaultState};

    try {
        const user = await User.findById(userId);
        if (!user) return {allowed: false, usage: defaultState};

        let tm = user.thinkingMode || defaultState;
        const now = new Date();

        if (!tm.lastReset || (now - new Date(tm.lastReset) > 86400000)) {
            tm = {count: 0, lastReset: now};
        }

        let allowed = true;
        if (attemptConsume) {
            if (tm.count >= 2) {
                allowed = false;
            } else {
                tm.count++;
                user.thinkingMode = tm;
                await user.save();
            }
        }

        return {allowed, usage: tm};
    } catch {
        return {allowed: false, usage: defaultState};
    }
};

export const initialPrompt = async (req, res) => {
    let {
        isRestrictedMode,
        isBmsMode,
        isEteqMode,
        geminiApiKey,
        sessionId,
        conversationHistory,
        keyIdentifier,
        userId
    } = req;

    const prompt = isRestrictedMode && !isBmsMode && !isEteqMode
        ? 'سلام! لطفاً خودتان را به عنوان یک دستیار هوش مصنوعی مفید به زبان فارسی و به صورت دوستانه و مختصر معرفی کنید.'
        : 'Hello! Please introduce yourself as a helpful AI assistant in a friendly, concise way in English.';

    if (!req.cookies?.session_id && userId) {
        sessionId = ConversationManager.getOrCreateSessionId(userId, req.userIp);
        ConversationManager.mapUserToSession(userId, sessionId);
        conversationHistory = [];
    }

    try {
        const {usage: thinkingModeUsage} = await manageThinkingMode(userId, false);
        const systemInstruction = await constructSystemPrompt(req, prompt);
        const {text: greeting} = await callGeminiAPI(prompt, conversationHistory, geminiApiKey, isRestrictedMode, false, keyIdentifier, isBmsMode, null, systemInstruction, false, isEteqMode);

        const updated = ConversationManager.appendAndSave(sessionId, conversationHistory, null, greeting);
        res.json({response: greeting, isBmsMode, isRestrictedMode, isEteqMode, thinkingModeUsage, sessionId});
        if (!isEteqMode) syncToDB(sessionId, userId, updated);
    } catch (error) {
        const fallback = isRestrictedMode && !isBmsMode && !isEteqMode
            ? 'سلام! من دستیار هوش مصنوعی شما هستم. چطور می‌توانم امروز به شما کمک کنم؟'
            : 'Hello! I\'m your AI assistant powered by Google Gemini. How can I help you today?';
        res.json({response: fallback, isBmsMode, isRestrictedMode, isEteqMode});
    }
};

export const ask = async (req, res) => {
    let {message, useWebSearch, useThinkingMode} = req.body;
    useThinkingMode = String(useThinkingMode) === 'true';

    if (!validateMessage(message)) return res.status(400).json({error: 'Valid message is required'});

    const {
        isRestrictedMode,
        isBmsMode,
        isEteqMode,
        geminiApiKey,
        sessionId,
        conversationHistory,
        keyIdentifier,
        userId
    } = req;

    const {allowed, usage} = await manageThinkingMode(userId, useThinkingMode);
    if (useThinkingMode && !allowed) useThinkingMode = false;

    try {
        const systemInstruction = await constructSystemPrompt(req, message);
        const fileData = getFileData(req.file);

        const {
            text,
            sources
        } = await callGeminiAPI(message, conversationHistory, geminiApiKey, isRestrictedMode, useWebSearch, keyIdentifier, isBmsMode, fileData, systemInstruction, useThinkingMode, isEteqMode);

        const updated = ConversationManager.appendAndSave(sessionId, conversationHistory, message, text);
        res.json({reply: text, sources, thinkingModeUsage: usage, sessionId});
        if (!isEteqMode) syncToDB(sessionId, userId, updated);
    } catch (error) {
        console.error(error.message);
        res.status(500).json({error: 'Sorry, I encountered an error. Please try again.', details: error.message});
    }
};

export const handleAPIEndpoint = (apiCall, apiName) => async (req, res) => {
    console.log(`[DEBUG] Request received in controller for: ${apiName}`);
    console.log('[DEBUG] Content-Type:', req.headers['content-type']);
    console.log('[DEBUG] Body:', req.body);

    if (!apiCall) return res.status(501).json({error: `${apiName} service not available`});

    const {message, model} = req.body;

    if (!validateMessage(message)) {
        console.error('[DEBUG] Validation Failed: Message is invalid', message);
        return res.status(400).json({error: 'Valid message is required'});
    }
    if (apiName === 'ArvanCloud' && !model) return res.status(400).json({error: 'Model is required'});

    const {sessionId, conversationHistory, userId, isEteqMode} = req;

    try {
        console.log(`[DEBUG] Constructing system prompt...`);
        const systemInstruction = await constructSystemPrompt(req, message);
        console.log(`[DEBUG] System prompt constructed. File data processing...`);

        let fileData = null;

        if (req.file) {
            const raw = getFileData(req.file);
            fileData = apiName === 'ArvanCloud'
                ? `data:${raw.mimeType};base64,${raw.data}`
                : raw;
        }

        const response = apiName === 'ArvanCloud'
            ? await apiCall(message, conversationHistory, model, fileData, systemInstruction)
            : await apiCall(message, conversationHistory, systemInstruction);

        const updated = ConversationManager.appendAndSave(sessionId, conversationHistory, message, response);
        res.json({reply: response, sessionId});
        if (!isEteqMode) syncToDB(sessionId, userId, updated);
    } catch (error) {
        console.error(`[ERROR] API Handler Failed for ${apiName}:`, error.message);
        if (error.stack) console.error(error.stack);
        if (error.response?.data) console.error('API Response Data:', JSON.stringify(error.response.data, null, 2));

        res.status(500).json({error: 'Sorry, I encountered an error. Please try again.', details: error.message});
    }
};

export const simpleApi = async (req, res) => {
    if (!callSimpleGeminiAPI) return res.status(501).json({error: 'Simple API service not configured'});

    const finalMessage = req.body
        ? (typeof req.body === 'string' ? req.body : (req.body.message ?? JSON.stringify(req.body)))
        : '';

    if (!finalMessage || typeof finalMessage !== 'string' || !finalMessage.trim()) {
        return res.status(400).json({error: 'Empty or invalid content.'});
    }

    try {
        const response = await callSimpleGeminiAPI(finalMessage, req.geminiApiKey, req.keyIdentifier);
        res.json({response});
    } catch (error) {
        console.error(error.message);
        res.status(500).json({error: 'Processing failed', details: error.message});
    }
};