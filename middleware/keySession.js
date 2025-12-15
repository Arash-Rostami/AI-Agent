import jwt from 'jsonwebtoken';
import {KeySessionManager} from '../utils/sessionManager.js';
import {ConversationManager} from '../utils/conversationManager.js';
import {JWT_SECRET} from '../config/index.js';

export const sessionManager = new KeySessionManager([
    process.env.GOOGLE_API_KEY_ALT,
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_ALT,
    process.env.GEMINI_API_KEY_PREMIUM,
]);

export const apiKeyMiddleware = (req, res, next) => {
    // 1. Determine User ID
    let userId = null;
    let rawUserId = req.query.user || req.headers['x-user-id'];

    // Handle Iframe/External App Identity
    if (rawUserId && String(rawUserId).trim().toLowerCase() !== 'null') {
        const referer = req.headers['referer'] || req.headers['x-frame-referer'] || '';
        try {
            if (referer) {
                const origin = new URL(referer).hostname;
                // Concatenate origin and ID (e.g., "export.communitasker.io_5")
                userId = `${origin}_${rawUserId}`;
            } else {
                // Fallback if no referer, just use the raw ID
                userId = rawUserId;
            }
        } catch (e) {
            // If URL parsing fails, just use raw ID
            userId = rawUserId;
        }
    }
    // Handle Direct Login (JWT Cookie)
    else if (req.cookies.jwt) {
        try {
            const decoded = jwt.verify(req.cookies.jwt, JWT_SECRET);
            userId = decoded.id; // Using the ID from the token
        } catch (e) {
            // Invalid token, treat as anonymous
            userId = null;
        }
    }

    const userIp = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
    // Key Identifier for rate limiting (fallback to IP if no user)
    const keyIdentifier = userId || userIp;


    // Session ID for conversation history
    const isExternalService = ['/ask-groq', '/ask-openrouter', '/ask-arvan'].some(p => req.path.startsWith(p));
    const allocatedKey = isExternalService ? null : sessionManager.getKeyForIP(keyIdentifier);

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
    req.userId = userId; // This can be null (anonymous)
    req.userIp = userIp;
    req.conversationHistory = conversationHistory;
    req.keyIdentifier = keyIdentifier;

    console.log(`🔑 ID: ${userId || 'anonymous'} | IP: ${userIp} | Session: ...${sessionId.slice(-8)} | Key: ...${allocatedKey?.slice(-4) ?? req.body?.model ?? req.path}`);

    next();
};

export function saveConversationHistory(sessionId, history) {
    ConversationManager.saveHistory(sessionId, history);
}

export function clearConversationHistory(sessionId) {
    ConversationManager.clearHistory(sessionId);
}
