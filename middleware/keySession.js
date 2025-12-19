import {KeySessionManager} from '../utils/sessionManager.js';
import {ConversationManager} from '../utils/conversationManager.js';
import {SILENT_PATH} from "../utils/logManager.js";


export const sessionManager = new KeySessionManager([
    process.env.GOOGLE_API_KEY_ALT,
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_ALT,
    process.env.GEMINI_API_KEY_PREMIUM,
]);

export const apiKeyMiddleware = (req, res, next) => {
    const isExternalService = ['/ask-groq', '/ask-openrouter', '/ask-arvan'].some(p => req.path.startsWith(p));

    //first time hitting:iframe and app users
    const isRootGet = req.path === '/' && req.method === 'GET';

    // API Key rotation for gemini
    req.geminiApiKey = isExternalService ? null : sessionManager.getKeyForIP(req.keyIdentifier)

    //follow-up requests of app & iframe users respectively
    let sessionId = req.cookies?.session_id;
    if (!sessionId && !isRootGet && req.userId) sessionId = ConversationManager.getActiveSession(req.userId);

    //initial request of iframe & app users to use in follow-up session id
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

    next();
};

export function saveConversationHistory(sessionId, history) {
    ConversationManager.saveHistory(sessionId, history);
}

export function clearConversationHistory(sessionId) {
    ConversationManager.clearHistory(sessionId);
}