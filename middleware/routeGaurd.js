import {protect} from "./authGuard.js";

export const guardChatRoutes = (req, res, next) => {
    const publicPaths = ['/login.html', '/js/login.js', '/auth/login', '/favicon.ico'];
    const protectedPaths = ['/', '/index.html'];

    if (publicPaths.includes(req.path)) return next();

    if (protectedPaths.includes(req.path) || req.path.startsWith('/ask-') || req.path.startsWith('/initial-prompt')) {
        return protect(req, res, next);
    }

    next();
};