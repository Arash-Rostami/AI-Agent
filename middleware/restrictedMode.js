import {ALLOWED_ORIGINS} from "../config/index.js";
import {saveRestrictedIP, isRestrictedIP} from "../utils/restrictedSession.js";

export const checkRestrictedMode = (req, res, next) => {
    // 1. Determine Identity (IP)
    const userIp = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();

    // 2. Check Referer (Source of Truth)
    const clientReferer = req.headers['x-frame-referer'] || req.headers.referer || '';
    let isRestricted = ALLOWED_ORIGINS.some(origin => clientReferer.startsWith(origin));
    let isBms = clientReferer.includes('export.communitasker.io');

    // 3. Logic: If Referer valid -> Save IP. Else -> Check IP.
    if (isRestricted) {
        saveRestrictedIP(userIp, isBms);

        // Still set UI cookies for immediate frontend hiding (User Experience)
        // Even if we rely on IP for security, the cookie helps avoid flicker if the browser allows it.
        res.cookie('restricted_ui', 'true', {sameSite: 'None', secure: true, httpOnly: false});
        if (isBms) res.cookie('bms_ui', 'true', {sameSite: 'None', secure: true, httpOnly: false});

    } else {
        const sessionState = isRestrictedIP(userIp);
        if (sessionState.isRestricted) {
            isRestricted = true;
            isBms = sessionState.isBms;
        }
    }

    req.isRestrictedMode = isRestricted;
    req.isBmsMode = isBms;

    if (req.isRestrictedMode) {
        console.log(`🔒 Restricted Mode: ACTIVE (IP: ${userIp})`);
        if (req.isBmsMode) console.log('🏭 BMS Mode: ACTIVE');
    }

    next();
};
