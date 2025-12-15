import express from 'express';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {clearConversationHistory, saveConversationHistory} from '../middleware/keySession.js';
import {syncToDatabase} from '../utils/interactionLogManager.js';
import {searchVectors, syncDocuments} from '../utils/vectorManager.js';
import InteractionLog from '../models/InteractionLog.js';
import {ConversationManager} from '../utils/conversationManager.js';



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

    router.get('/api/history', async (req, res) => {
        try {
            const {userId} = req;
            if (!userId) return res.status(401).json({error: 'Unauthorized'});

            const logs = await InteractionLog.find({userId})
                .sort({createdAt: -1})
                .select('sessionId createdAt messages');

            const validLogs = [];
            const idsToDelete = [];

            for (const log of logs) {
                const userMsg = log.messages.find(m => m.role === 'user');
                if (userMsg) {
                    validLogs.push({
                        sessionId: log.sessionId,
                        createdAt: log.createdAt,
                        preview: userMsg.parts[0].text.length > 50
                            ? userMsg.parts[0].text.substring(0, 50) + '...'
                            : userMsg.parts[0].text
                    });
                } else {
                    idsToDelete.push(log._id);
                }
            }

            if (idsToDelete.length > 0) {
                InteractionLog.deleteMany({ _id: { $in: idsToDelete } })
                    .catch(e => console.error('Cleanup error:', e));
            }

            res.json({history: validLogs});
        } catch (error) {
            console.error('Fetch history error:', error);
            res.status(500).json({error: 'Failed to fetch history'});
        }
    });

    router.get('/api/history/:id', async (req, res) => {
        try {
            const {userId} = req;
            const {id: sessionId} = req.params;
            if (!userId) return res.status(401).json({error: 'Unauthorized'});

            const log = await InteractionLog.findOne({userId, sessionId});

            if (!log) return res.status(404).json({error: 'Session not found'});

            res.json({messages: log.messages});
        } catch (error) {
            console.error('Fetch session details error:', error);
            res.status(500).json({error: 'Failed to fetch session details'});
        }
    });

    router.post('/api/vector/sync', async (req, res) => {
        try {
            const result = await syncDocuments();
            res.json({success: true, message: 'Vector database synced successfully', data: result});
        } catch (error) {
            console.error('Vector sync error:', error);
            res.status(500).json({success: false, error: error.message});
        }
    });

    router.get('/initial-prompt', async (req, res) => {
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
    });

    router.post('/ask', async (req, res) => {
        const {message, useWebSearch} = req.body;
        if (!validateMessage(message)) return res.status(400).json({error: 'Valid message is required'});

        const {isRestrictedMode, isBmsMode, geminiApiKey, sessionId, conversationHistory, keyIdentifier, userId} = req;

        try {
            const augmentedMessage = await enrichPromptWithContext(message);
            const {
                text: responseText,
                sources
            } = await callGeminiAPI(augmentedMessage, conversationHistory, geminiApiKey, isRestrictedMode, useWebSearch, keyIdentifier, isBmsMode);
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