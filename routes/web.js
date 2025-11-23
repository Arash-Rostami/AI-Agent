// const config = require('config')
import express from 'express';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

export default function createRouter(callGeminiAPI, callGrokAPI = null, callSimpleGeminiAPI = null) {
    router.get('', (req, res) => {
        res.sendFile(join(__dirname, 'public', 'index.html'));
    });

// Initial greeting endpoint
    router.get('/initial-prompt', async (req, res) => {
        const {isRestrictedMode} = req;

        const prompt = isRestrictedMode
            ? 'سلام! لطفاً خودتان را به عنوان یک دستیار هوش مصنوعی مفید به زبان فارسی و به صورت دوستانه و مختصر معرفی کنید.'
            : 'Hello! Please introduce yourself as a helpful AI assistant in a friendly, concise way.';

        try {
            const greeting = await callGeminiAPI(
                prompt,
                [],
                req.geminiApiKey,
                isRestrictedMode
            );
            res.json({response: greeting});
        } catch (error) {
            const fallback = isRestrictedMode
                ? 'سلام! من دستیار هوش مصنوعی شما هستم. چطور می‌توانم امروز به شما کمک کنم؟'
                : 'Hello! I\'m your AI assistant powered by Google Gemini. How can I help you today?';
            res.json({
                response: fallback
            });
        }
    });

// Chat endpoint
    router.post('/ask', async (req, res) => {
        const {message, history} = req.body;

        if (!message || typeof message !== 'string') {
            return res.status(400).json({error: 'Valid message is required'});
        }

        const {isRestrictedMode} = req;

        try {
            const response = await callGeminiAPI(message, history || [], req.geminiApiKey, isRestrictedMode);
            res.json({reply: response});
        } catch (error) {
            console.error('Chat error:', error.message);
            res.status(500).json({
                error: 'Sorry, I encountered an error. Please try again.',
                details: error.message
            });
        }
    });
// Groq chat endpoint
    router.post('/ask-groq', async (req, res) => {
        if (!callGrokAPI) return res.status(501).json({error: 'Groq service not available'});

        const {message, history} = req.body;
        if (!message || typeof message !== 'string') {
            return res.status(400).json({error: 'Valid message is required'});
        }

        try {
            const response = await callGrokAPI(message, history || []);
            res.json({reply: response});
        } catch (error) {
            console.error('Groq error:', error.message);
            res.status(500).json({
                error: 'Sorry, I encountered an error. Please try again.',
                details: error.message
            });
        }
    });

// Test endpoint
    router.get('/test', async (req, res) => {
        try {
            const testResponse = await callGeminiAPI(
                'Say "Connection test successful!" if you can receive this message.',
                [],
                req.geminiApiKey
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
// Alternative service endpoint
    router.get('/grok', async (req, res) => {
        try {
            // const reply = await callGrokAPI(message, history || []);
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

        let finalMessage = '';

        if (req.body) {
            if (typeof req.body === 'string') {
                finalMessage = req.body;
            } else if (typeof req.body === 'object') {
                if (req.body.message) {
                    finalMessage = req.body.message;
                } else {
                    finalMessage = JSON.stringify(req.body);
                }
            }
        }

        if (!finalMessage || typeof finalMessage !== 'string' || finalMessage.trim().length === 0) {
            return res.status(400).json({
                error: 'Empty or invalid content. Please send a body with your request (JSON, Text, or Form).'
            });
        }

        try {
            const response = await callSimpleGeminiAPI(finalMessage, req.geminiApiKey);
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

