import InteractionLog from '../models/InteractionLog.js';
import {clearConversationHistory} from '../middleware/keySession.js';

export const getHistory = async (req, res) => {
    try {
        const {userId} = req;
        if (!userId) return res.status(401).json({error: 'Unauthorized'});

        const logs = await InteractionLog.find({userId})
            .sort({createdAt: -1})
            .select('sessionId createdAt messages');

        const validLogs = [];
        const idsToDelete = [];

        for (const log of logs) {
            const userMsg = log.messages.find(m => m.role === 'user');
            if (userMsg) {
                validLogs.push({
                    sessionId: log.sessionId,
                    createdAt: log.createdAt,
                    preview: userMsg.parts[0].text.length > 50
                        ? userMsg.parts[0].text.substring(0, 50) + '...'
                        : userMsg.parts[0].text
                });
            } else {
                idsToDelete.push(log._id);
            }
        }

        if (idsToDelete.length > 0) {
            InteractionLog.deleteMany({_id: {$in: idsToDelete}})
                .catch(e => console.error('Cleanup error:', e));
        }

        res.json({history: validLogs});
    } catch (error) {
        console.error('Fetch history error:', error);
        res.status(500).json({error: 'Failed to fetch history'});
    }
};

export const deleteSession = async (req, res) => {
    try {
        const {userId} = req;
        const {id: sessionId} = req.params;
        if (!userId) return res.status(401).json({error: 'Unauthorized'});

        const result = await InteractionLog.deleteMany({sessionId, userId});

        if (result.deletedCount === 0) return res.status(404).json({error: 'Session not found or already deleted'});
        res.json({success: true, message: 'Session deleted successfully'});
    } catch (error) {
        console.error('Delete session error:', error);
        res.status(500).json({error: 'Failed to delete session'});
    }
};

export const clearChat = (req, res) => {
    clearConversationHistory(req.sessionId);
    res.json({success: true});
};
