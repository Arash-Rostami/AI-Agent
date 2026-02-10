import jwt from 'jsonwebtoken';
import {JWT_SECRET} from '../config/index.js';
import User from '../models/User.js';
import AccessLog from '../models/AccessLog.js';

export const protect = async (req, res, next) => {

    if (req.isRestrictedMode || req.isBmsMode || req.isEteqMode) {
        try {
            await AccessLog.create({
                userId: req.userId || req.query.user || 'anonymous_iframe',
                ipAddress: req.userIp || req.ip,
                origin: req.headers['x-frame-referer'] || req.headers.referer || 'unknown'
            });
        } catch (error) {
            console.error('Error logging iframe access:', error);
        }
        return next();
    }

    let token = req.cookies.jwt;
    if (!token) return res.redirect('/login.html');

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = await User.findById(decoded.id).select('-password');

        if (!req.user) return res.redirect('/login.html');
        next();
    } catch (error) {
        console.error('JWT Verification failed:', error.message);
        return res.redirect('/login.html');
    }
};
