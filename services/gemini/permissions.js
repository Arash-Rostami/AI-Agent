import {AFFIRMATION_REGEX} from '../../utils/affirmationMemoryManager.js';

const PERMISSION_PHRASES = {
    en: "outside my Persol expertise",
    fa: "از حوزه‌ی کاری من در پرسال خارج است"
};

export function hasUserGranted(history) {
    for (let i = 0; i < history.length - 1; i++) {
        const msg = history[i];
        if (msg.role === 'assistant' && msg.content) {
            const hasPermissionPhrase = Object.values(PERMISSION_PHRASES).some(p => msg.content.includes(p));
            if (hasPermissionPhrase) {
                const nextMsg = history[i + 1];
                if (nextMsg?.role === 'user' && AFFIRMATION_REGEX.test(String(nextMsg.content).normalize('NFC'))) {
                    return true;
                }
            }
        }
    }
    return false;
}