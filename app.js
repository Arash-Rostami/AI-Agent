import express from 'express';
import {startServer} from './utils/serverManager.js';


//Instantiating
import {callGeminiAPI, callSimpleGeminiAPI} from './services//gemini/index.js';
import callGrokAPI from './services/groq/index.js';
import callOpenRouterAPI from './services/openrouter/index.js';
import callArvanCloudAPI from './services/arvancloud/index.js';
import errorHandler from './middleware/errorHandler.js';
import createRouter from './routes/web.js';
import {apiKeyMiddleware} from './middleware/keySession.js';
import {allowFrameEmbedding} from './middleware/frameGuard.js';
import {checkRestrictedMode} from './middleware/restrictedMode.js';
// import {guardChatRoutes} from './middleware/routeGaurd.js';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.js';

// Middleware
const app = express();
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(express.text());
app.use(cookieParser());
app.use(allowFrameEmbedding);
app.use(checkRestrictedMode);
app.use(apiKeyMiddleware);
// app.use(guardChatRoutes);
app.use(express.static('public'));

app.use('/', createRouter(
    callGeminiAPI,
    callGrokAPI,
    callOpenRouterAPI,
    callSimpleGeminiAPI,
    callArvanCloudAPI
));
// app.use('/auth', authRoutes);

app.use(errorHandler);

// Start server
await startServer(app);