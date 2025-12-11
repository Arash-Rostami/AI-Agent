import {ALLOWED_ORIGINS} from "../config/index.js";

export const checkRestrictedMode = (req, res, next) => {
    const clientReferer = req.headers['x-frame-referer'] || req.headers.referer || '';
    console.log(`🔍 Incoming Referer: '${clientReferer}'`);

    // 1. Check Referer
    let isRestricted = ALLOWED_ORIGINS.some(origin => clientReferer.startsWith(origin));
    let isBms = clientReferer.includes('export.communitasker.io');

    // 2. Check Cookie Fallback (if referer check failed)
    if (!isRestricted && req.cookies && req.cookies.restricted_mode === 'true') {
        isRestricted = true;
        // console.log('🍪 Restricted Mode: Resumed from Cookie');
    }
    if (!isBms && req.cookies && req.cookies.bms_mode === 'true') {
        isBms = true;
        isRestricted = true; // BMS implies restricted
    }

    // 3. Set State & Cookies
    if (isRestricted) {
        req.isRestrictedMode = true;
        // Persist via cookie for subsequent API calls (important for iframes)
        res.cookie('restricted_mode', 'true', {
            httpOnly: true,
            secure: true,
            sameSite: 'None', // Required for cross-site iframe cookies
            maxAge: 24 * 60 * 60 * 1000 // 1 day
        });
        console.log('🔒 Restricted Mode: ACTIVE (Tools Limited)');
    }

    if (isBms) {
        req.isBmsMode = true;
        res.cookie('bms_mode', 'true', {
            httpOnly: true,
            secure: true,
            sameSite: 'None',
            maxAge: 24 * 60 * 60 * 1000
        });
        console.log('🏭 BMS Mode: ACTIVE (Database Search Enabled)');
    }

    next();
};