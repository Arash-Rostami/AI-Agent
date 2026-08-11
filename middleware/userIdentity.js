import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
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

    // Fully-anonymous (no JWT, no X-User-Id/?user): mint a stable anon_id so each
    // browser is a distinct identity — saved to Mongo under a unique id, not the
    // literal 'anonymous' bucket. Prevents two anon users sharing one history.
    if (!userId) {
        userId = req.cookies?.anon_id || crypto.randomUUID();
        req.anonId = userId;
        res.cookie('anon_id', req.anonId, {httpOnly: true, maxAge: 365 * 24 * 60 * 60 * 1000, sameSite: 'strict'});
    }

    const userIp = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();

    req.userId = userId;
    req.userIp = userIp;
    req.origin = origin;
    req.keyIdentifier = userId || userIp;
    next();
};

