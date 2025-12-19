const SILENT_PATHS = ['/initial-prompt', '/auth/admin', '/api/history'];
const STATIC_ASSETS = /\.(css|js|ico|png|jpg|jpeg|svg|woff|woff2|ttf|map)$/i;

export const SILENT_PATH = (req) =>
    SILENT_PATHS.includes(req.path) || STATIC_ASSETS.test(req.path);