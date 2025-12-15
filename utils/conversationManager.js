import crypto from 'crypto';

const conversationStore = new Map();

export class ConversationManager {
    static getOrCreateSessionId(userId, ip) {
        return crypto.randomUUID();
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
