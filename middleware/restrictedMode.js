import { ALLOWED_ORIGINS } from "../config/index.js";
import { SILENT_PATH } from "../utils/logManager.js";

export const checkRestrictedMode = (req, _, next) => {
    const { 'x-frame-referer': frameRef, referer: stdRef } = req.headers;
    const referer = (frameRef || stdRef || '').toLowerCase();

    req.isRestrictedMode = ALLOWED_ORIGINS.some(o => referer.startsWith(o));
    req.isBmsMode = referer.includes('export.communitasker.io');
    req.isEteqMode = referer.includes('eteq.vercel.app');

    if (!SILENT_PATH(req)) {
        if (req.isBmsMode) console.log('🏭 BMS Mode: ACTIVE (Database Search Enabled)');
        if (req.isEteqMode) console.log('🏭 ETEQ Mode: ACTIVE (Knowledge Base Enabled)');
        if (req.isRestrictedMode) console.log('🔒 Restricted Mode: ACTIVE (Tools Limited)');
    }

    next();
};