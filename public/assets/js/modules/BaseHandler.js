import MessageFormatter from './MessageFormatter.js';

export default class BaseHandler {
    constructor() {
        this.userId = this.getUserId();
        this.parentOrigin = this.getParentOrigin();
        this.formatter = new MessageFormatter();
    }

    getUserId() {
        return new URLSearchParams(window.location.search).get('user');
    }

    getParentOrigin() {
        try {
            if (window.self !== window.top) {
                return window.location.ancestorOrigins?.[0] || (document.referrer ? new URL(document.referrer).origin : null) || window.location.origin;
            }

            const storageKey = `parentOrigin_${this.userId || 'default'}`;
            const stored = sessionStorage.getItem(storageKey);
            if (stored) return stored;

            const origin = window.location.origin;
            sessionStorage.setItem(storageKey, origin);
            return origin;
        } catch {
            return window.location.origin;
        }
    }
}