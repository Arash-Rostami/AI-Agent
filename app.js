import express from 'express';
import {PORT} from './config/index.js';

//Instantiating
import callGeminiAPI from './services/gemini.js';
import errorHandler from './middleware/errorHandler.js';
import createRouter from './routes/web.js';

// Middleware
const app = express();
app.use(express.static('public'));
app.use(express.json());
app.use(errorHandler);

app.use('/', createRouter(callGeminiAPI));

// Start server
app.listen(PORT, () => {
    console.log(`\n 📱 Server running successfully on http://localhost:${PORT}\n 🛑 Press Ctrl+C/Cmd+C to stop the server\n`);
});