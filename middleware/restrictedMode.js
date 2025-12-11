import {ALLOWED_ORIGINS} from "../config/index.js";

export const checkRestrictedMode = (req, res, next) => {
    const clientReferer = req.headers['x-frame-referer'] || req.headers.referer || '';
    let isRestricted = ALLOWED_ORIGINS.some(origin => clientReferer.startsWith(origin));
    let isBms = clientReferer.includes('export.communitasker.io');

    if (isRestricted) {
        const cookieOpts = {httpOnly: true, sameSite: 'None', secure: true};
        res.cookie('restricted_mode', 'true', cookieOpts);
        // Readable by frontend to hide UI immediately
        res.cookie('restricted_ui', 'true', {sameSite: 'None', secure: true, httpOnly: false});

        if (isBms) {
            res.cookie('bms_mode', 'true', cookieOpts);
            res.cookie('bms_ui', 'true', {sameSite: 'None', secure: true, httpOnly: false});
        }
    } else {
        isRestricted = req.cookies?.restricted_mode === 'true';
        isBms = req.cookies?.bms_mode === 'true';
    }

    req.isRestrictedMode = isRestricted;
    req.isBmsMode = isBms;

    if (req.isRestrictedMode) {
        console.log(`🔒 Restricted Mode: ACTIVE (Referer: ${!!clientReferer}, Cookie: ${!clientReferer})`);
        if (req.isBmsMode) console.log('🏭 BMS Mode: ACTIVE');
    }

    next();
};