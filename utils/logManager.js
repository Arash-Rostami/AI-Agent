const SILENT_PATHS = ['/initial-prompt', '/auth/admin', '/api/history'];

export const SILENT_PATH = (req ) => SILENT_PATHS.includes(req.path);