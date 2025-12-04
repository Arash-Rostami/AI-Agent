import {KeySessionManager} from '../utils/sessionManager.js';
import {ConversationManager} from '../utils/conversationManager.js';


const sessionManager = new KeySessionManager([
    process.env.GOOGLE_API_KEY,
    process.env.GOOGLE_API_KEY_ALT,
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_ALT
]);

export const apiKeyMiddleware = (req, res, next) => {
    // 1. user identifier (flexible)
    let userId = req.query.user || req.headers['x-user-id'];
    if (userId && String(userId).trim().toLowerCase() === 'null') userId = null;
    const userIp = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();

    // 2. API key based on userId OR IP (fallback)
    const keyIdentifier = userId || userIp;
    const allocatedKey = sessionManager.getKeyForIP(keyIdentifier);

    // 3. session ID for conversation history
    const sessionId = ConversationManager.getOrCreateSessionId(userId, userIp);
    const conversationHistory = ConversationManager.getHistory(sessionId);

    // 4. request payload
    req.geminiApiKey = allocatedKey;
    req.sessionId = sessionId;
    req.userId = userId;
    req.userIp = userIp;
    req.conversationHistory = conversationHistory;

    console.log(`🔑 ID: ${userId || 'standalone'} | IP: ${userIp} | Session: ...${sessionId.slice(-8)} | Key: ...${allocatedKey.slice(-4)}`);

    next();
};

export function saveConversationHistory(sessionId, history) {
    ConversationManager.saveHistory(sessionId, history);
}

export function clearConversationHistory(sessionId) {
    ConversationManager.clearHistory(sessionId);
}