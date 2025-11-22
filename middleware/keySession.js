import { KeySessionManager } from '../utils/sessionManager.js';

const sessionManager = new KeySessionManager([
    process.env.GOOGLE_API_KEY,
    process.env.GEMINI_API_KEY
]);

export const apiKeyMiddleware = (req, res, next) => {
    // 1. Get IP reliably
    const userIp = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();

    // 2. Get the Sticky Key
    const allocatedKey = sessionManager.getKeyForIP(userIp);

    // 3. Attach to the Request object
    req.geminiApiKey = allocatedKey;

    console.log(`🔑 Request from ${userIp} assigned key: ...${allocatedKey.slice(-4)}`);

    next();
};