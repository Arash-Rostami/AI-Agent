import express from 'express';
import upload from "../middleware/uploadHandler.js";
import * as InteractionController from "../controllers/InteractionController.js";
import * as VectorController from "../controllers/VectorController.js";
import * as ChatController from "../controllers/ChatController.js";
import * as PageController from "../controllers/PageController.js";
import callGrokAPI from '../services/groq/index.js';
import callOpenRouterAPI from '../services/openrouter/index.js';
import callArvanCloudAPI from '../services/arvancloud/index.js';

const router = express.Router();

// chat endpoints
router.get('', PageController.serveIndex);

router.get('/initial-prompt', ChatController.initialPrompt);

router.post('/ask', upload.single('file'), ChatController.ask);

router.post('/ask-groq', upload.single('file'), ChatController.handleAPIEndpoint(callGrokAPI, 'Groq'));

router.post('/ask-openrouter', upload.single('file'), ChatController.handleAPIEndpoint(callOpenRouterAPI, 'OpenRouter'));

router.post('/ask-arvan', upload.single('file'), ChatController.handleAPIEndpoint(callArvanCloudAPI, 'ArvanCloud'));

router.post('/clear-chat', InteractionController.clearChat);

router.post('/new-chat', InteractionController.newChat);


//api endpoints
router.get('/api/history', InteractionController.getInteraction);

router.get('/api/history/:id', InteractionController.getInteractionDetails);

router.delete('/api/history/:id', InteractionController.deleteInteraction);

router.post('/api/vector/sync', VectorController.syncVectors);

router.post('/api/', ChatController.simpleApi);

export default router;
