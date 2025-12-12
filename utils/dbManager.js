import Conversation from '../models/Conversation.js';

export async function syncToDatabase(sessionId, userId, history) {
    try {
        // Map the Gemini history format to our DB schema if necessary
        // Gemini format: { role: 'user'|'model', parts: [{ text: '...' }] }
        // Our Schema: { role: String, parts: [{ text: String }], timestamp: Date }

        const validMessages = history.map(msg => ({
            role: msg.role === 'tool_request' || msg.role === 'tool_response' ? 'system' : msg.role,
            parts: Array.isArray(msg.parts) ? msg.parts : [{ text: JSON.stringify(msg.content || msg.args || "") }],
            timestamp: new Date()
        }));

        await Conversation.findOneAndUpdate(
            { sessionId },
            {
                userId: userId || 'anonymous',
                messages: validMessages
            },
            { upsert: true, new: true }
        );
    } catch (error) {
        console.error('Failed to sync conversation to DB:', error.message);
        // We do not throw here to avoid breaking the main app flow
    }
}
