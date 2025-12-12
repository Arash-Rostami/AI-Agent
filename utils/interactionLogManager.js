import InteractionLog from '../models/InteractionLog.js';

export async function syncToDatabase(sessionId, userId, history) {
    try {

        const validMessages = history.map(msg => ({
            role: msg.role === 'tool_request' || msg.role === 'tool_response' ? 'system' : msg.role,
            parts: Array.isArray(msg.parts) ? msg.parts : [{text: JSON.stringify(msg.content || msg.args || "")}],
            timestamp: new Date()
        }));

        await InteractionLog.findOneAndUpdate(
            {sessionId},
            {
                userId: userId || 'anonymous',
                messages: validMessages
            },
            {upsert: true, new: true}
        );
    } catch (error) {
        console.error('Failed to sync conversation to DB:', error.message);
    }
}
