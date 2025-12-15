import express from 'express';
import jwt from 'jsonwebtoken';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {clearConversationHistory, saveConversationHistory} from '../middleware/keySession.js';
import {syncToDatabase} from '../utils/interactionLogManager.js';
import { syncDocuments, searchVectors } from '../controllers/vectorController.js';
import { JWT_SECRET } from '../config/index.js';
import User from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

const appendAndSave = (sessionId, conversationHistory, userMsg, assistantMsg) => {
    const updated = [
        ...conversationHistory,
        ...(userMsg ? [{role: 'user', content: userMsg}] : []),
        ...(assistantMsg ? [{role: 'assistant', content: assistantMsg}] : [])
    ];
    saveConversationHistory(sessionId, updated);
    return updated;
};

const validateMessage = (msg) => msg && typeof msg === 'string';

const syncToDB = (sessionId, userId, history) =>
    syncToDatabase(sessionId, userId, history).catch(err => console.error('DB sync failed:', err.message));

const enrichPromptWithContext = async (message) => {
    try {
        const results = await searchVectors(message);
        if (!results || results.length === 0) return message;

        const context = results.map(r => r.text).join('\n\n---\n\n');
        return `Context information is below.\n---------------------\n${context}\n---------------------\nGiven the context information and not prior knowledge, answer the query.\nQuery: ${message}`;
    } catch (error) {
        console.error('Context enrichment failed:', error);
        return message;
    }
};

export default function createRouter(
    callGeminiAPI,
    callGrokAPI = null,
    callOpenRouterAPI = null,
    callSimpleGeminiAPI = null,
    callArvanCloudAPI = null
) {
    router.get('', (req, res) => res.sendFile(join(__dirname, 'public', 'index.html')));

    router.post('/api/vector/sync', async (req, res) => {
        try {
            // Security check
            const token = req.cookies.jwt;
            if (!token) return res.status(401).json({ success: false, error: 'Unauthorized' });

            const decoded = jwt.verify(token, JWT_SECRET);
            const user = await User.findById(decoded.id);

            if (!user || !['arash', 'siamak', 'ata'].includes(user.username.toLowerCase())) {
                return res.status(403).json({ success: false, error: 'Forbidden' });
            }

            const result = await syncDocuments();
            res.json({ success: true, message: 'Vector database synced successfully', data: result });
        } catch (error) {
            console.error('Vector sync error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    router.get('/initial-prompt', async (req, res) => {
        const {isRestrictedMode, isBmsMode, geminiApiKey, sessionId, conversationHistory, keyIdentifier, userId} = req;
        const prompt = isRestrictedMode && !isBmsMode
            ? 'سلام! لطفاً خودتان را به عنوان یک دستیار هوش مصنوعی مفید به زبان فارسی و به صورت دوستانه و مختصر معرفی کنید.'
            : 'Hello! Please introduce yourself as a helpful AI assistant in a friendly, concise way.';

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
    });

    router.post('/ask', async (req, res) => {
        const {message, useWebSearch} = req.body;
        if (!validateMessage(message)) return res.status(400).json({error: 'Valid message is required'});

        const {isRestrictedMode, isBmsMode, geminiApiKey, sessionId, conversationHistory, keyIdentifier, userId} = req;

        try {
            // Note: For Gemini, we might want to inject context differently or rely on its own tools,
            // but for uniformity with this request, we modify the message.
            // However, modifying the 'message' directly affects what is saved to history as the 'user' message.
            // Ideally, we send the augmented prompt to the AI, but save the original user message to history.
            // But callGeminiAPI uses the 'message' arg as the last user prompt.
            // To keep history clean, we might need to adjust callGeminiAPI or just accept the augmented prompt is hidden logic.
            // Given the requirement "vectorize all my instructions... check timestamp... update db",
            // I will augment the prompt sent to the API.

            const augmentedMessage = await enrichPromptWithContext(message);

            const {
                text: responseText,
                sources
            } = await callGeminiAPI(augmentedMessage, conversationHistory, geminiApiKey, isRestrictedMode, useWebSearch, keyIdentifier, isBmsMode);

            // Save original message to history, not the massive augmented one
            const updated = appendAndSave(sessionId, conversationHistory, message, responseText);
            res.json({reply: responseText, sources});
            syncToDB(sessionId, userId, updated);
        } catch (error) {
            console.error('Chat error:', error.message);
            res.status(500).json({error: 'Sorry, I encountered an error. Please try again.', details: error.message});
        }
    });

    const handleAPIEndpoint = (apiCall, apiName) => async (req, res) => {
        if (!apiCall) return res.status(501).json({error: `${apiName} service not available`});

        const {message, model} = req.body;
        if (!validateMessage(message)) return res.status(400).json({error: 'Valid message is required'});
        if (apiName === 'ArvanCloud' && !model) return res.status(400).json({error: 'Model is required'});

        const {sessionId, conversationHistory, userId} = req;

        try {
            const augmentedMessage = await enrichPromptWithContext(message);

            const response = apiName === 'ArvanCloud'
                ? await apiCall(augmentedMessage, conversationHistory, model)
                : await apiCall(augmentedMessage, conversationHistory);

            const updated = appendAndSave(sessionId, conversationHistory, message, response);
            res.json({reply: response});
            syncToDB(sessionId, userId, updated);
        } catch (error) {
            console.error(`${apiName} error:`, error.message);
            res.status(500).json({error: 'Sorry, I encountered an error. Please try again.', details: error.message});
        }
    };

    router.post('/ask-groq', handleAPIEndpoint(callGrokAPI, 'Groq'));
    router.post('/ask-openrouter', handleAPIEndpoint(callOpenRouterAPI, 'OpenRouter'));
    router.post('/ask-arvan', handleAPIEndpoint(callArvanCloudAPI, 'ArvanCloud'));

    router.post('/clear-chat', (req, res) => {
        clearConversationHistory(req.sessionId);
        res.json({success: true});
    });

    router.get('/test', async (req, res) => {
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
    });

    router.get('/grok', async (req, res) => {
        try {
            const reply = await callGrokAPI('Hi — give one-sentence reason why fast LMs matter.');
            res.json({reply});
        } catch (error) {
            console.error('Grok error:', error.message || error);
            res.status(500).json({error: 'Grok API error', details: error.message || String(error)});
        }
    });

    router.post('/api/', async (req, res) => {
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
    });

    return router;
}