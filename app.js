import express from 'express';
import {PORT} from './config/index.js';

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
import connectDB from './config/db.js';
import cookieParser from 'cookie-parser';
import { protect } from './middleware/auth/authMiddleware.js';
import authRoutes from './routes/auth.js';

// Connect to Database
connectDB();

// Middleware
const app = express();
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(express.text());
app.use(cookieParser());
app.use(allowFrameEmbedding);
app.use(checkRestrictedMode);
app.use(apiKeyMiddleware);

// Auth Routes (Unprotected)
app.use('/auth', authRoutes);

// Protect specific routes or static files if needed
// We want to protect the main app (index.html) but allow login page and assets
app.use((req, res, next) => {
    // List of public paths that don't need auth
    const publicPaths = ['/login.html', '/js/login.js', '/auth/login', '/favicon.ico'];

    // If it's a static asset (css, js, images) likely it's public, but let's be safe.
    // Ideally, we protect the main entry point '/' and API routes.

    if (publicPaths.includes(req.path)) {
        return next();
    }

    // If requesting root /, we must verify auth
    if (req.path === '/' || req.path === '/index.html') {
        return protect(req, res, next);
    }

    // API routes are already protected by 'protect' middleware usage later or we can apply globally
    // But since createRouter mounts to '/', we should apply protect there or selectively.
    // The requirement says "only inside the app user can Use chatbot".
    // So the API endpoints should be protected.

    // Let's rely on specific route protection or pattern matching.
    // If it's an API call to our services:
    if (req.path.startsWith('/ask-') || req.path.startsWith('/initial-prompt')) {
        return protect(req, res, next);
    }

    next();
});

app.use(express.static('public'));



app.use('/', createRouter(
    callGeminiAPI,
    callGrokAPI,
    callOpenRouterAPI,
    callSimpleGeminiAPI,
    callArvanCloudAPI
));
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
    console.log(`\n 📱 Server running successfully on http://localhost:${PORT}\n 🛑 Press Ctrl+C/Cmd+C to stop the server\n`);
});