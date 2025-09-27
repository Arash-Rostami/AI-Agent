import express from 'express';
import {PORT} from './config/index.js';

//Instantiating
import callGeminiAPI from './services/gemini.js';
import callGrokAPI from './services/grok.js';
import errorHandler from './middleware/errorHandler.js';
import createRouter from './routes/web.js';

// Middleware
const app = express();
app.use(express.static('public'));
app.use(express.json());
app.use(errorHandler);

// (async () => {
//     const reply = await callGrokAPI('Hi — give one-sentence reason why fast LMs matter.');
//     console.log('Grok reply:', reply);
// })();

app.use('/', createRouter(callGeminiAPI, callGrokAPI));

// Start server
app.listen(PORT, () => {
    console.log(`\n 📱 Server running successfully on http://localhost:${PORT}\n 🛑 Press Ctrl+C/Cmd+C to stop the server\n`);
});