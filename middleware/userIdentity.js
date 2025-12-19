import jwt from 'jsonwebtoken';
import {JWT_SECRET} from '../config/index.js';

const hostName = ref => {
    try {
        return ref ? new URL(ref).hostname : null;
    } catch {
        return null;
    }
};
export const identityMiddleware = (req, res, next) => {
    let origin = null;
    let userId = null;
    const rawUserId = req.query.user || req.headers['x-user-id'];
    const referer = req.headers['x-frame-referer'] || req.headers['referer'] || '';

    // Handle Iframe/External App Identity
    if (rawUserId && String(rawUserId).trim().toLowerCase() !== 'null') {
        try {
            origin = hostName(referer);
            userId = origin ? `${origin}_${rawUserId}` : rawUserId;
        } catch {
            userId = rawUserId;
        }
    }
    // Handle Direct Login (JWT Cookie)
    else if (req.cookies.jwt) {
        try {
            origin = hostName(referer);
            const decoded = jwt.verify(req.cookies.jwt, JWT_SECRET);
            userId = decoded.id;
        } catch (e) {
            userId = null;
        }
    }

    const userIp = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();

    req.userId = userId;
    req.userIp = userIp;
    req.origin = origin;
    req.keyIdentifier = userId || userIp;
    next();
};

