import express from 'express';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {clearConversationHistory, saveConversationHistory} from '../middleware/keySession.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

export default function createRouter(
    callGeminiAPI,
    callGrokAPI = null,
    callOpenRouterAPI = null,
    callSimpleGeminiAPI = null
) {
    const sendIndex = (req, res) => res.sendFile(join(__dirname, 'public', 'index.html'));

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

    router.get('', sendIndex);

    router.get('/initial-prompt', async (req, res) => {
        const {isRestrictedMode, geminiApiKey, sessionId, conversationHistory, keyIdentifier} = req;
        const prompt = isRestrictedMode
            ? 'سلام! لطفاً خودتان را به عنوان یک دستیار هوش مصنوعی مفید به زبان فارسی و به صورت دوستانه و مختصر معرفی کنید.'
            : 'Hello! Please introduce yourself as a helpful AI assistant in a friendly, concise way.';

        try {
            const { text: greeting } = await callGeminiAPI(prompt, conversationHistory, geminiApiKey, isRestrictedMode, false, keyIdentifier);
            appendAndSave(sessionId, conversationHistory, null, greeting);
            res.json({response: greeting});
        } catch (error) {
            const fallback = isRestrictedMode
                ? 'سلام! من دستیار هوش مصنوعی شما هستم. چطور می‌توانم امروز به شما کمک کنم؟'
                : 'Hello! I\'m your AI assistant powered by Google Gemini. How can I help you today?';
            res.json({response: fallback});
        }
    });

    router.post('/ask', async (req, res) => {
        const {message, useWebSearch} = req.body;
        if (!validateMessage(message)) return res.status(400).json({error: 'Valid message is required'});

        const {isRestrictedMode, geminiApiKey, sessionId, conversationHistory, keyIdentifier} = req;

        try {
            const { text: responseText, sources } = await callGeminiAPI(message, conversationHistory, geminiApiKey, isRestrictedMode, useWebSearch, keyIdentifier);
            appendAndSave(sessionId, conversationHistory, message, responseText);
            res.json({reply: responseText, sources: sources});
        } catch (error) {
            console.error('Chat error:', error.message);
            res.status(500).json({
                error: 'Sorry, I encountered an error. Please try again.',
                details: error.message
            });
        }
    });

    router.post('/ask-groq', async (req, res) => {
        if (!callGrokAPI) return res.status(501).json({error: 'Groq service not available'});

        const {message} = req.body;
        if (!validateMessage(message)) return res.status(400).json({error: 'Valid message is required'});

        const {sessionId, conversationHistory} = req;

        try {
            const response = await callGrokAPI(message, conversationHistory);
            appendAndSave(sessionId, conversationHistory, message, response);
            res.json({reply: response});
        } catch (error) {
            console.error('Groq error:', error.message);
            res.status(500).json({
                error: 'Sorry, I encountered an error. Please try again.',
                details: error.message
            });
        }
    });

    router.post('/ask-openrouter', async (req, res) => {
        if (!callOpenRouterAPI) return res.status(501).json({error: 'OpenRouter Grok service not available'});

        const {message} = req.body;
        if (!validateMessage(message)) return res.status(400).json({error: 'Valid message is required'});

        const {sessionId, conversationHistory} = req;

        try {
            const response = await callOpenRouterAPI(message, conversationHistory);
            appendAndSave(sessionId, conversationHistory, message, response);
            res.json({reply: response});
        } catch (error) {
            console.error('OpenRouter Grok error:', error.message);
            res.status(500).json({
                error: 'Sorry, I encountered an error. Please try again.',
                details: error.message
            });
        }
    });

    router.post('/clear-chat', (req, res) => {
        const {sessionId} = req;
        clearConversationHistory(sessionId);
        res.json({success: true});
    });

    router.get('/test', async (req, res) => {
        try {
            const { text: testResponse } = await callGeminiAPI(
                'Say "Connection test successful!" if you can receive this message.',
                [],
                req.geminiApiKey,
                false,
                false,
                req.keyIdentifier
            );
            res.json({
                status: 'success',
                message: 'API connection working!',
                response: testResponse
            });
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
            res.status(500).json({
                error: 'Grok API error',
                details: error.message || String(error)
            });
        }
    });

    router.post('/api/', async (req, res) => {
        if (!callSimpleGeminiAPI) return res.status(501).json({error: 'Simple API service not configured'});

        const finalMessage = req.body
            ? (typeof req.body === 'string'
                ? req.body
                : (req.body.message ?? JSON.stringify(req.body)))
            : '';

        if (!finalMessage || typeof finalMessage !== 'string' || finalMessage.trim().length === 0) {
            return res.status(400).json({
                error: 'Empty or invalid content. Please send a body with your request (JSON, Text, or Form).'
            });
        }

        try {
            const response = await callSimpleGeminiAPI(finalMessage, req.geminiApiKey, req.keyIdentifier);
            res.json({response});
        } catch (error) {
            console.error('Simple API Error:', error.message);
            res.status(500).json({
                error: 'Processing failed',
                details: error.message
            });
        }
    });

    return router;
}