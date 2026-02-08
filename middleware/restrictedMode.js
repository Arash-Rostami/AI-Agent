import {ALLOWED_ORIGINS} from "../config/index.js";
import {SILENT_PATH} from "../utils/logManager.js";

export const checkRestrictedMode = (req, res, next) => {
    // Check both X-Frame-Referer (sent by our frontend) and standard Referer (sent by browser)
    // This handles cases where X-Frame-Referer might be stale/cached (e.g. localhost) but the actual
    // request comes from an iframe (Referer: eteq...).
    const frameReferer = req.headers['x-frame-referer'] || '';
    const standardReferer = req.headers.referer || '';

    // Combine them for robust checking, or check individually if needed.
    // For isRestrictedMode, we generally trust X-Frame-Referer if present to allow specific client-side logic,
    // but for mode detection (BMS/ETEQ), we want to catch ANY signal.
    const effectiveReferer = (frameReferer + standardReferer).toLowerCase();

    req.isRestrictedMode = ALLOWED_ORIGINS.some(o => effectiveReferer.includes(o)); // Relaxed to includes for safety
    req.isBmsMode = effectiveReferer.includes('export.communitasker.io');
    req.isEteqMode = effectiveReferer.includes('eteq');

    if (!SILENT_PATH(req)) {
        console.log(`🔍 [RestrictedCheck] FrameRef: "${frameReferer}", StdRef: "${standardReferer}", isRestricted: ${req.isRestrictedMode}, isBms: ${req.isBmsMode}, isEteq: ${req.isEteqMode}`);
        req.isBmsMode && console.log('🏭 BMS Mode: ACTIVE (Database Search Enabled)');
        req.isEteqMode && console.log('🏭 ETEQ Mode: ACTIVE (Knowledge Base Enabled)');
        req.isRestrictedMode && console.log('🔒 Restricted Mode: ACTIVE (Tools Limited)');
    }

    next();
};