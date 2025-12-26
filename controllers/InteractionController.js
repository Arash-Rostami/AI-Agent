import InteractionLog from '../models/InteractionLog.js';
import {clearConversationHistory} from '../middleware/keySession.js';
import {ConversationManager} from '../utils/conversationManager.js';


export const getInteraction = async (req, res) => {
    try {
        const {userId} = req;
        const {cursor, limit = 10} = req.query;

        if (!userId) return res.status(401).json({error: 'Unauthorized'});

        const queryLimit = parseInt(limit, 10);
        const matchStage = {
            userId,
            'messages.role': 'user' // Only fetch sessions that have user messages
        };

        if (cursor) {
            matchStage.createdAt = {$lt: new Date(cursor)};
        } else {
            // Automatic Deletion: On initial load (no cursor), clean up empty sessions.
            // This restores the requested feature to prevent collection bloating.
            // Fire-and-forget to avoid blocking the response.
            InteractionLog.deleteMany({
                userId,
                'messages.role': {$ne: 'user'}
            }).catch(err => console.error('Auto-cleanup error:', err));
        }

        const logs = await InteractionLog.aggregate([
            {$match: matchStage},
            {$sort: {createdAt: -1}},
            {$limit: queryLimit},
            {
                $project: {
                    sessionId: 1,
                    createdAt: 1,
                    // Filter messages to get only user messages
                    userMessages: {
                        $filter: {
                            input: "$messages",
                            as: "msg",
                            cond: {$eq: ["$$msg.role", "user"]}
                        }
                    }
                }
            },
            {
                $project: {
                    sessionId: 1,
                    createdAt: 1,
                    // Extract the first user message object
                    firstUserMsg: { $arrayElemAt: ["$userMessages", 0] }
                }
            },
            {
                $project: {
                    sessionId: 1,
                    createdAt: 1,
                    // Extract the text from the first part of the first user message and substring it
                    preview: {
                        $substrCP: [
                            { $arrayElemAt: ["$firstUserMsg.parts.text", 0] },
                            0,
                            50
                        ]
                    }
                }
            }
        ]);

        const nextCursor = logs.length === queryLimit ? logs[logs.length - 1].createdAt : null;

        res.json({
            history: logs.map(log => ({
                sessionId: log.sessionId,
                createdAt: log.createdAt,
                preview: log.preview ? (log.preview.length === 50 ? log.preview + '...' : log.preview) : ''
            })),
            nextCursor
        });

    } catch (error) {
        console.error('Fetch history error:', error);
        res.status(500).json({error: 'Failed to fetch history'});
    }
};

export const getInteractionDetails = async (req, res) => {
    try {
        const {userId} = req;
        const {id: sessionId} = req.params;

        if (!userId) return res.status(401).json({error: 'Unauthorized'});

        const log = await InteractionLog.findOne({sessionId, userId}).select('messages');

        if (!log) return res.status(404).json({error: 'Session not found'});

        res.json({messages: log.messages});
    } catch (error) {
        console.error('Fetch session details error:', error);
        res.status(500).json({error: 'Failed to fetch session details'});
    }
};

export const deleteInteraction = async (req, res) => {
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

export const newChat = (req, res) => {
    const newSessionId = ConversationManager.getOrCreateSessionId(req.userId, req.userIp);
    ConversationManager.mapUserToSession(req.userId, newSessionId);

    res.cookie('session_id', newSessionId, {
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: 'strict'
    });

    res.json({sessionId: newSessionId});
};
