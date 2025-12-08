import {KeySessionManager} from '../utils/sessionManager.js';
import {ConversationManager} from '../utils/conversationManager.js';


export const sessionManager = new KeySessionManager([
    process.env.GOOGLE_API_KEY_ALT,
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_ALT,
    process.env.GEMINI_API_KEY_PREMIUM,
]);

export const apiKeyMiddleware = (req, res, next) => {
    // 1. user identifier (flexible)
    let userId = req.query.user || req.headers['x-user-id'];
    if (userId && String(userId).trim().toLowerCase() === 'null') userId = null;
    const userIp = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();

    // 2. session ID for conversation history (Always needed)
    const sessionId = ConversationManager.getOrCreateSessionId(userId, userIp);
    const conversationHistory = ConversationManager.getHistory(sessionId);

    // 3. Determine if this request needs a Gemini Key
    // We only allocate/log a Gemini key if the route is NOT one of the external providers
    const isArvanCloud = req.path.startsWith('/ask-arvan');
    const isExternalService = req.path.startsWith('/ask-groq') ||
                              req.path.startsWith('/ask-openrouter') ||
                              isArvanCloud;

    let allocatedKey = null;

    if (!isExternalService) {
         // API key based on userId OR IP (fallback)
         const keyIdentifier = userId || userIp;
         allocatedKey = sessionManager.getKeyForIP(keyIdentifier);
    }

    // 4. request payload
    req.geminiApiKey = allocatedKey;
    req.sessionId = sessionId;
    req.userId = userId;
    req.userIp = userIp;
    req.conversationHistory = conversationHistory;
    // req.keyIdentifier is used by Gemini service for key rotation
    req.keyIdentifier = userId || userIp;

    // Safe logging
    const safeSessionId = (sessionId || '').slice(-8);
    const safeKey = (allocatedKey || '').slice(-4);
    const safeUserId = userId || 'standalone';

    if (allocatedKey) {
        console.log(`🔑 ID: ${safeUserId} | IP: ${userIp} | Session: ...${safeSessionId} | Key: ...${safeKey}`);
    } else {
        let serviceName = 'External/Other';
        if (isArvanCloud) {
             const modelName = req.body && req.body.model ? req.body.model : 'Unknown Model';
             serviceName = `ArvanCloud (${modelName})`;
        } else if (req.path.startsWith('/ask-groq')) {
             serviceName = 'Groq';
        } else if (req.path.startsWith('/ask-openrouter')) {
             serviceName = 'OpenRouter';
        }

        console.log(`🔍 ID: ${safeUserId} | IP: ${userIp} | Session: ...${safeSessionId} | Service: ${serviceName}`);
    }

    next();
};

export function saveConversationHistory(sessionId, history) {
    ConversationManager.saveHistory(sessionId, history);
}

export function clearConversationHistory(sessionId) {
    ConversationManager.clearHistory(sessionId);
}
