import {ALLOWED_ORIGINS} from "../config/index.js";

export const checkRestrictedMode = (req, res, next) => {
    const clientReferer = req.headers['x-frame-referer'] || req.headers.referer || '';
    console.log(`🔍 Incoming Referer: '${clientReferer}'`);

    req.isRestrictedMode = ALLOWED_ORIGINS.some(origin => clientReferer.startsWith(origin));
    if (clientReferer.includes('export.communitasker.io')) {
        req.isBmsMode = true;
        console.log('🏭 BMS Mode: ACTIVE (Database Search Enabled)');
    }

    if (req.isRestrictedMode) console.log('🔒 Restricted Mode: ACTIVE (Tools Limited)');

    next();
};