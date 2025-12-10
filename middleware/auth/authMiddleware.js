import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../../config/index.js';
import User from '../../models/User.js';
import AccessLog from '../../models/AccessLog.js';

export const protect = async (req, res, next) => {
    // 1. Check for Iframe/BMS Mode (Restricted Mode)
    // If enabled, we skip standard login but log the access
    if (req.isRestrictedMode || req.isBmsMode) {
        try {
            // "user id will be logged or can be sved in specific table"
            // userId comes from apiKeyMiddleware which runs before this?
            // Actually, we need to ensure apiKeyMiddleware populated req.userId or req.query.user
            // But apiKeyMiddleware is global.

            await AccessLog.create({
                userId: req.userId || req.query.user || 'anonymous_iframe',
                ipAddress: req.userIp || req.ip,
                origin: req.headers['x-frame-referer'] || req.headers.referer || 'unknown'
            });
        } catch (error) {
            console.error('Error logging iframe access:', error);
            // We don't block access if logging fails, as the goal is to allow access
        }
        return next();
    }

    // 2. Direct Access (No Iframe) -> Require Login
    // Check for token in cookies
    let token = req.cookies.jwt;

    if (!token) {
        // If it's an API call, return 401
        if (req.path.startsWith('/api/') || req.headers.accept?.includes('application/json')) {
            return res.status(401).json({ message: 'Not authorized, no token' });
        }
        // If it's a page load (e.g. root /), redirect to login
        return res.redirect('/login.html');
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = await User.findById(decoded.id).select('-password');
        if (!req.user) {
             if (req.path.startsWith('/api/') || req.headers.accept?.includes('application/json')) {
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }
            return res.redirect('/login.html');
        }
        next();
    } catch (error) {
        console.error('JWT Verification failed:', error.message);
        if (req.path.startsWith('/api/') || req.headers.accept?.includes('application/json')) {
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
        return res.redirect('/login.html');
    }
};
