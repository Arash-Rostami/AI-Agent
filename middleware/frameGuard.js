import {ALLOWED_ORIGINS} from "../config/index.js";

export const allowFrameEmbedding = (req, res, next) => {

    if (
        req.headers.referer &&
        ALLOWED_ORIGINS.some(origin => req.headers.referer.startsWith(origin))
    ) {
        res.removeHeader('X-Frame-Options');
        res.setHeader('Content-Security-Policy', "frame-ancestors *");
    }

    next();
};
