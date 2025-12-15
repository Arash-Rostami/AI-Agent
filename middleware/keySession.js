import {KeySessionManager} from '../utils/sessionManager.js';
import {ConversationManager} from '../utils/conversationManager.js';

export const sessionManager = new KeySessionManager([
    process.env.GOOGLE_API_KEY_ALT,
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_ALT,
    process.env.GEMINI_API_KEY_PREMIUM,
]);

export const apiKeyMiddleware = (req, res, next) => {
    // User identifier (flexible)
    let userId = req.query.user || req.headers['x-user-id'];
    if (userId && String(userId).trim().toLowerCase() === 'null') userId = null;
    const userIp = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
    const keyIdentifier = userId || userIp;


    // Session ID for conversation history
    const isExternalService = ['/ask-groq', '/ask-openrouter', '/ask-arvan'].some(p => req.path.startsWith(p));
    const allocatedKey = isExternalService ? null : sessionManager.getKeyForIP(keyIdentifier);
    // const sessionId = ConversationManager.getOrCreateSessionId(userId, userIp);
    let sessionId = req.cookies?.session_id;
    const isRootGet = req.path === '/' && req.method === 'GET';
    if (isRootGet || !sessionId) sessionId = ConversationManager.getOrCreateSessionId(userId, userIp);

    if (isRootGet) {
        res.cookie('session_id', sessionId, {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000,
            sameSite: 'strict'
        });
    }
    const conversationHistory = ConversationManager.getHistory(sessionId);


    // Request payload
    req.geminiApiKey = allocatedKey;
    req.sessionId = sessionId;
    req.userId = userId;
    req.userIp = userIp;
    req.conversationHistory = conversationHistory;
    req.keyIdentifier = keyIdentifier;

    console.log(`🔑 ID: ${userId || 'standalone'} | IP: ${userIp} | Session: ...${sessionId.slice(-8)} | Key: ...${allocatedKey?.slice(-4) ?? req.body?.model ?? req.path}`);

    next();
};

export function saveConversationHistory(sessionId, history) {
    ConversationManager.saveHistory(sessionId, history);
}

export function clearConversationHistory(sessionId) {
    ConversationManager.clearHistory(sessionId);
}