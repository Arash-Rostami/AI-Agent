import express from 'express';
import upload from '../middleware/upload.js';
import * as ChatController from '../controllers/ChatController.js';
import * as HistoryController from '../controllers/HistoryController.js';
import * as VectorController from '../controllers/VectorController.js';
import * as PageController from '../controllers/PageController.js';

const router = express.Router();

// Page Routes
router.get('', PageController.serveIndex);

// History Routes
router.get('/api/history', HistoryController.getHistory);
router.delete('/api/history/:id', HistoryController.deleteSession);
router.post('/clear-chat', HistoryController.clearChat);

// Vector Routes
router.post('/api/vector/sync', VectorController.syncVectors);

// Chat Routes
router.get('/initial-prompt', ChatController.initialPrompt);
router.post('/ask', upload.single('file'), ChatController.ask);
router.post('/ask-groq', upload.single('file'), ChatController.askGroq);
router.post('/ask-openrouter', upload.single('file'), ChatController.askOpenRouter);
router.post('/ask-arvan', upload.single('file'), ChatController.askArvan);
router.post('/api/', ChatController.simpleApi);

// Test Routes
router.get('/test', ChatController.testConnection);
router.get('/grok', ChatController.grokTest);

export default router;
