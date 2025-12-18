import {callGeminiAPI, callSimpleGeminiAPI} from '../services/gemini/index.js';
import callGrokAPI from '../services/groq/index.js';
import callOpenRouterAPI from '../services/openrouter/index.js';
import callArvanCloudAPI from '../services/arvancloud/index.js';
import {syncToDatabase} from '../utils/interactionLogManager.js';
import {enrichPromptWithContext} from '../utils/vectorManager.js';
import {ConversationManager, appendAndSave} from '../utils/conversationManager.js';

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
        const {text: greeting} = await callGeminiAPI(prompt, conversationHistory, geminiApiKey, isRestrictedMode, false, keyIdentifier, isBmsMode);
        const updated = appendAndSave(sessionId, conversationHistory, null, greeting);
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
        const augmentedMessage = await enrichPromptWithContext(message);
        let fileData = null;
        if (req.file) fileData = {mimeType: req.file.mimetype, data: req.file.buffer.toString('base64')};

        const {
            text: responseText,
            sources
        } = await callGeminiAPI(augmentedMessage, conversationHistory, geminiApiKey, isRestrictedMode, useWebSearch, keyIdentifier, isBmsMode, fileData);
        const updated = appendAndSave(sessionId, conversationHistory, message, responseText);
        res.json({reply: responseText, sources});
        syncToDB(sessionId, userId, updated);
    } catch (error) {
        console.error('Chat error:', error.message);
        res.status(500).json({error: 'Sorry, I encountered an error. Please try again.', details: error.message});
    }
};

const handleAPIEndpoint = (apiCall, apiName) => async (req, res) => {
    if (!apiCall) return res.status(501).json({error: `${apiName} service not available`});

    const {message, model} = req.body;
    if (!validateMessage(message)) return res.status(400).json({error: 'Valid message is required'});
    if (apiName === 'ArvanCloud' && !model) return res.status(400).json({error: 'Model is required'});

    const {sessionId, conversationHistory, userId} = req;

    try {
        const augmentedMessage = await enrichPromptWithContext(message);

        let fileData = null;
        if (apiName === 'ArvanCloud' && req.file) {
            const base64Data = req.file.buffer.toString('base64');
            const mimeType = req.file.mimetype;
            fileData = `data:${mimeType};base64,${base64Data}`;
        }

        const response = apiName === 'ArvanCloud'
            ? await apiCall(augmentedMessage, conversationHistory, model, fileData)
            : await apiCall(augmentedMessage, conversationHistory);
        const updated = appendAndSave(sessionId, conversationHistory, message, response);
        res.json({reply: response});
        syncToDB(sessionId, userId, updated);
    } catch (error) {
        console.error(`${apiName} error:`, error.message);
        res.status(500).json({error: 'Sorry, I encountered an error. Please try again.', details: error.message});
    }
};

export const askGroq = handleAPIEndpoint(callGrokAPI, 'Groq');
export const askOpenRouter = handleAPIEndpoint(callOpenRouterAPI, 'OpenRouter');
export const askArvan = handleAPIEndpoint(callArvanCloudAPI, 'ArvanCloud');

export const testConnection = async (req, res) => {
    try {
        const {text: testResponse} = await callGeminiAPI(
            'Say "Connection test successful!" if you can receive this message.',
            [], req.geminiApiKey, false, false, req.keyIdentifier
        );
        res.json({status: 'success', message: 'API connection working!', response: testResponse});
    } catch (error) {
        res.status(500).json({
            status: 'error',
            error: error.message,
            details: error.response?.data || 'Unknown error'
        });
    }
};

export const grokTest = async (req, res) => {
    try {
        const reply = await callGrokAPI('Hi — give one-sentence reason why fast LMs matter.');
        res.json({reply});
    } catch (error) {
        console.error('Grok error:', error.message || error);
        res.status(500).json({error: 'Grok API error', details: error.message || String(error)});
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
