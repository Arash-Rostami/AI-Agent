import crypto from 'crypto';

const conversationStore = new Map();

export class ConversationManager {
    static getOrCreateSessionId(userId, ip) {
        const identifier = userId || ip || 'anonymous';
        return crypto.createHash('sha256').update(`session_${identifier}`).digest('hex');
    }

    static getHistory(sessionId) {
        return conversationStore.get(sessionId) || [];
    }

    static saveHistory(sessionId, history) {
        conversationStore.set(sessionId, history);
    }

    static clearHistory(sessionId) {
        conversationStore.delete(sessionId);
    }

    static getAllSessions() {
        return conversationStore.size;
    }
}
