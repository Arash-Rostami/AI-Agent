import express from 'express';
import {PORT} from './config/index.js';

//Instantiating
import callGeminiAPI, {callSimpleGeminiAPI} from './services/gemini.js';
import callGrokAPI from './services/grok.js';
import callOpenRouterAPI from './services/openRouter.js';
import errorHandler from './middleware/errorHandler.js';
import createRouter from './routes/web.js';
import {apiKeyMiddleware} from './middleware/keySession.js';
import {allowFrameEmbedding} from './middleware/frameGuard.js';
import {checkRestrictedMode} from './middleware/restrictedMode.js';

// Middleware
const app = express();
app.use(allowFrameEmbedding);
app.use(checkRestrictedMode);
app.use(apiKeyMiddleware);
app.use(express.static('public'));
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(express.text());

// (async () => {
//     const reply = await callGrokAPI('Hi — give one-sentence reason why fast LMs matter.');
//     console.log('Grok reply:', reply);
// })();

app.use('/', createRouter(callGeminiAPI, callGrokAPI, callOpenRouterAPI, callSimpleGeminiAPI));
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
    console.log(`\n 📱 Server running successfully on http://localhost:${PORT}\n 🛑 Press Ctrl+C/Cmd+C to stop the server\n`);
});