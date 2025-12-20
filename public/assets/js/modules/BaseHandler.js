export default class BaseHandler {
    getUserId() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('user');
    }

    getParentOrigin() {
        const userId = this.getUserId();
        const storageKey = `parentOrigin_${userId || 'default'}`;
        const stored = sessionStorage.getItem(storageKey);
        if (stored) return stored;

        try {
            let origin = null;
            if (window.self !== window.top) {
                origin = window.location.ancestorOrigins?.[0] || (document.referrer ? new URL(document.referrer).origin : null);
            }
            origin = origin || window.location.origin;

            sessionStorage.setItem(storageKey, origin);
            return origin;
        } catch {
            return window.location.origin;
        }
    }
}
