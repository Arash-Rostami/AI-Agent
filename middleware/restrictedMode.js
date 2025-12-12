import {ALLOWED_ORIGINS} from "../config/index.js";

export const checkRestrictedMode = (req, res, next) => {
    const referer = req.headers['x-frame-referer'] || req.headers.referer || '';

    req.isRestrictedMode = ALLOWED_ORIGINS.some(o => referer.startsWith(o));
    req.isBmsMode = referer.includes('export.communitasker.io');

    console.log(`🔍 Referer: '${referer}'`);
    req.isBmsMode && console.log('🏭 BMS Mode: ACTIVE (Database Search Enabled)');
    req.isRestrictedMode && console.log('🔒 Restricted Mode: ACTIVE (Tools Limited)');

    next();
};