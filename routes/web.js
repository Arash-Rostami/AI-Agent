// const config = require('config')
import express from 'express';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();


export default function createRouter(callGeminiAPI) {

    router.get('', (req, res) => {
        res.sendFile(join(__dirname, 'public', 'index.html'));
    });

// Initial greeting endpoint
    router.get('/initial-prompt', async (req, res) => {
        try {
            const greeting = await callGeminiAPI(
                'Hello! Please introduce yourself as a helpful AI assistant in a friendly, concise way.'
            );
            res.json({response: greeting});
        } catch (error) {
            res.json({
                response: 'Hello! I\'m your AI assistant powered by Google Gemini. How can I help you today?'
            });
        }
    });

// Chat endpoint
    router.post('/ask', async (req, res) => {
        const {message, history} = req.body;

        if (!message || typeof message !== 'string') {
            return res.status(400).json({error: 'Valid message is required'});
        }

        try {
            const response = await callGeminiAPI(message, history || []);
            res.json({reply: response});
        } catch (error) {
            console.error('Chat error:', error.message);
            res.status(500).json({
                error: 'Sorry, I encountered an error. Please try again.',
                details: error.message
            });
        }
    });

// Test endpoint
    router.get('/test', async (req, res) => {
        try {
            const testResponse = await callGeminiAPI('Say "Connection test successful!" if you can receive this message.');
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

    return router;
}

