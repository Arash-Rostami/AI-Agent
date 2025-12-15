import AccessLog from '../models/AccessLog.js';

export const logAccess = async (req, res, next) => {
    if (req.path !== '/' || req.method !== 'GET') {
        return next();
    }

    try {
        const accessEntry = {
            userId: req.userId || req.query.user || 'anonymous',
            ipAddress: req.userIp || req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
            origin: req.headers['x-frame-referer'] || req.headers.referer || 'direct',
            timestamp: new Date()
        };

        AccessLog.create(accessEntry)
            .catch(err =>
                console.error('Error writing AccessLog:', err.message)
            );
    } catch (error) {
        console.error('Access logging middleware error:', error);
    }

    next();
};
