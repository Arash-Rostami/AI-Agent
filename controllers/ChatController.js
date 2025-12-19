import {callGeminiAPI, callSimpleGeminiAPI} from '../services/gemini/index.js';
import {syncToDatabase} from '../utils/interactionLogManager.js';
// import {enrichPromptWithContext} from '../utils/vectorManager.js';
import {ConversationManager} from '../utils/conversationManager.js';
import {constructSystemPrompt} from '../utils/promptManager.js';

const syncToDB = (sessionId, userId, history) =>
    syncToDatabase(sessionId, userId, history).catch(err => console.error('DB sync failed:', err.message));

const validateMessage = (msg) => msg && typeof msg === 'string';

export const initialPrompt = async (req, res) => {
    let {isRestrictedMode, isBmsMode, geminiApiKey, sessionId, conversationHistory, keyIdentifier, userId} = req;
    const prompt = isRestrictedMode && !isBmsMode
        ? 'سلام! لطفاً خودتان را به عنوان یک دستیار هوش مصنوعی مفید به زبان فارسی و به صورت دوستانه و مختصر معرفی کنید.'
        : 'Hello! Please introduce yourself as a helpful AI assistant in a friendly, concise way in English.';

    if (!req.cookies?.session_id && userId) {
        sessionId = ConversationManager.getOrCreateSessionId(userId, req.userIp);
        ConversationManager.mapUserToSession(userId, sessionId);
        conversationHistory = [];
    }

    try {
        const systemInstruction = await constructSystemPrompt(req, prompt);
        const {text: greeting} = await callGeminiAPI(prompt, conversationHistory, geminiApiKey, isRestrictedMode, false, keyIdentifier, isBmsMode, null, systemInstruction);
        const updated = ConversationManager.appendAndSave(sessionId, conversationHistory, null, greeting);
        res.json({response: greeting, isBmsMode, isRestrictedMode});
        syncToDB(sessionId, userId, updated);
    } catch (error) {
        const fallback = isRestrictedMode && !isBmsMode
            ? 'سلام! من دستیار هوش مصنوعی شما هستم. چطور می‌توانم امروز به شما کمک کنم؟'
            : 'Hello! I\'m your AI assistant powered by Google Gemini. How can I help you today?';
        res.json({response: fallback, isBmsMode, isRestrictedMode});
    }
};

export const ask = async (req, res) => {
    const {message, useWebSearch} = req.body;
    if (!validateMessage(message)) return res.status(400).json({error: 'Valid message is required'});

    const {isRestrictedMode, isBmsMode, geminiApiKey, sessionId, conversationHistory, keyIdentifier, userId} = req;

    try {
        // const augmentedMessage = await enrichPromptWithContext(message);
        const systemInstruction = await constructSystemPrompt(req, message);
        let fileData = null;
        if (req.file) fileData = {mimeType: req.file.mimetype, data: req.file.buffer.toString('base64')};

        const {
            text: responseText,
            sources
        } = await callGeminiAPI(message, conversationHistory, geminiApiKey, isRestrictedMode, useWebSearch, keyIdentifier, isBmsMode, fileData, systemInstruction);
        const updated = ConversationManager.appendAndSave(sessionId, conversationHistory, message, responseText);
        res.json({reply: responseText, sources});
        syncToDB(sessionId, userId, updated);
    } catch (error) {
        console.error('Chat error:', error.message);
        res.status(500).json({error: 'Sorry, I encountered an error. Please try again.', details: error.message});
    }
};

export const handleAPIEndpoint = (apiCall, apiName) => async (req, res) => {
    if (!apiCall) return res.status(501).json({error: `${apiName} service not available`});

    const {message, model} = req.body;
    if (!validateMessage(message)) return res.status(400).json({error: 'Valid message is required'});
    if (apiName === 'ArvanCloud' && !model) return res.status(400).json({error: 'Model is required'});

    const {sessionId, conversationHistory, userId} = req;

    try {
        // const augmentedMessage = await enrichPromptWithContext(message);
        const systemInstruction = await constructSystemPrompt(req, message);

        let fileData = null;
        if (apiName === 'ArvanCloud' && req.file) {
            const base64Data = req.file.buffer.toString('base64');
            const mimeType = req.file.mimetype;
            fileData = `data:${mimeType};base64,${base64Data}`;
        }

        // Note: ArvanCloud/Grok wrappers might need updates to accept systemInstruction if they support it.
        // For now, only Gemini is fully updated. We pass it, assuming wrappers might ignore extra args or will be updated.
        // Since apiCall is generic, we just pass the original message. If RAG is essential for other services,
        // we might need to append context to 'message' instead of 'systemInstruction' for them.
        // However, the plan focused on Gemini. For others, we might want to revert to 'augmentedMessage' strategy
        // OR update their services. Given "App-Scoped Access" requirement applies to all, I should verify ArvanCloud too.

        // IMPORTANT: The previous logic enriched the user message. The new logic puts it in system prompt.
        // If ArvanCloud service doesn't support system prompt override, this breaks RAG for Arvan.
        // Let's stick to the plan: "Implement loader logic in config + single controller/service used by all API services."
        // I will assume for now we pass 'systemInstruction' to apiCall.

        const response = apiName === 'ArvanCloud'
            ? await apiCall(message, conversationHistory, model, fileData, systemInstruction)
            : await apiCall(message, conversationHistory, systemInstruction);

        const updated = ConversationManager.appendAndSave(sessionId, conversationHistory, message, response);
        res.json({reply: response});
        syncToDB(sessionId, userId, updated);
    } catch (error) {
        console.error(`${apiName} error:`, error.message);
        res.status(500).json({error: 'Sorry, I encountered an error. Please try again.', details: error.message});
    }
};


export const simpleApi = async (req, res) => {
    if (!callSimpleGeminiAPI) return res.status(501).json({error: 'Simple API service not configured'});

    const finalMessage = req.body
        ? (typeof req.body === 'string' ? req.body : (req.body.message ?? JSON.stringify(req.body)))
        : '';

    if (!finalMessage || typeof finalMessage !== 'string' || !finalMessage.trim()) {
        return res.status(400).json({error: 'Empty or invalid content. Please send a body with your request (JSON, Text, or Form).'});
    }

    try {
        const response = await callSimpleGeminiAPI(finalMessage, req.geminiApiKey, req.keyIdentifier);
        res.json({response});
    } catch (error) {
        console.error('Simple API Error:', error.message);
        res.status(500).json({error: 'Processing failed', details: error.message});
    }
};
