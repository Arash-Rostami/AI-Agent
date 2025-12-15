import {KeySessionManager} from '../utils/sessionManager.js';
import {ConversationManager} from '../utils/conversationManager.js';


export const sessionManager = new KeySessionManager([
    process.env.GOOGLE_API_KEY_ALT,
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_ALT,
    process.env.GEMINI_API_KEY_PREMIUM,
]);

export const apiKeyMiddleware = (req, res, next) => {
    // Session ID for conversation history
    const isExternalService = ['/ask-groq', '/ask-openrouter', '/ask-arvan'].some(p => req.path.startsWith(p));
    const isRootGet = req.path === '/' && req.method === 'GET';

    // API Key allocation
    req.geminiApiKey = isExternalService ? null : sessionManager.getKeyForIP(req.keyIdentifier)

    let sessionId = req.cookies?.session_id;

    if (!sessionId && !isRootGet && req.userId) sessionId = ConversationManager.getActiveSession(req.userId);
    if (isRootGet || !sessionId) {
        sessionId = ConversationManager.getOrCreateSessionId(req.userId, req.userIp);
        ConversationManager.mapUserToSession(req.userId, sessionId);
    }
    if (isRootGet) {
        res.cookie('session_id', sessionId, {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000,
            sameSite: 'strict'
        });
    }
    req.sessionId = sessionId;
    req.conversationHistory = ConversationManager.getHistory(sessionId);

    console.log(`🔑 ID: ${req.userId || 'anonymous'} | IP: ${req.userIp} | Session: ...${sessionId.slice(-8)} | Key: ...${req.geminiApiKey?.slice(-4) ?? req.body?.model ?? req.path}`);
    next();
};

export function saveConversationHistory(sessionId, history) {
    ConversationManager.saveHistory(sessionId, history);
}

export function clearConversationHistory(sessionId) {
    ConversationManager.clearHistory(sessionId);
}