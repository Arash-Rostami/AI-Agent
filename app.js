import express from 'express';
import {startServer} from './utils/serverManager.js';
import {initializeVectors} from './utils/vectorManager.js';

//Instantiating
import errorHandler from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import {createRouter} from './routes/web.js';
import {identityMiddleware} from './middleware/userIdentity.js';
import {apiKeyMiddleware} from './middleware/keySession.js';
import {allowFrameEmbedding} from './middleware/frameGuard.js';
import {checkRestrictedMode} from './middleware/restrictedMode.js';
import {guardChatRoutes} from './middleware/routeGaurd.js';
import cookieParser from 'cookie-parser';
import {logAccess} from './middleware/accessLogger.js';


// Middleware
const app = express();
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(express.text());
app.use(cookieParser());
app.use(allowFrameEmbedding);
app.use(express.static('public'));
app.use(checkRestrictedMode);
app.use(identityMiddleware);
app.use(apiKeyMiddleware);
app.use(logAccess);
app.use(guardChatRoutes);


app.use('/', createRouter());
app.use('/auth', authRoutes);

app.use(errorHandler);
// Start server
await startServer(app);
await initializeVectors();