import { sendEmail } from '../services/emailTool.js';
import InteractionLog from '../models/InteractionLog.js';
import {clearConversationHistory} from '../middleware/keySession.js';
import {ConversationManager} from '../utils/conversationManager.js';

export const getInteraction = async (req, res) => {
    try {
        const {userId} = req;
        const {cursor, limit = 10} = req.query;

        if (!userId) return res.status(401).json({error: 'Unauthorized'});

        const queryLimit = parseInt(limit, 10);

        if (!cursor) InteractionLog.deleteMany({userId, 'messages.role': {$ne: 'user'}}).catch(() => {
        });


        const logs = await InteractionLog.fetchHistoryPreviews(userId, cursor, queryLimit);

        const nextCursor = logs.length === queryLimit ? logs[logs.length - 1].createdAt : null;

        res.json({
            history: logs.map(log => ({
                sessionId: log.sessionId,
                createdAt: log.createdAt,
                preview: log.preview ? (log.preview.length === 50 ? `${log.preview}...` : log.preview) : ''
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

export const restoreInteraction = async (req, res) => {
    try {
        const {userId} = req;
        const {id: oldSessionId} = req.params;

        if (!userId) return res.status(401).json({error: 'Unauthorized'});

        const log = await InteractionLog.findOne({sessionId: oldSessionId, userId}).select('messages');
        if (!log) return res.status(404).json({error: 'Session not found'});

        const newSessionId = ConversationManager.getOrCreateSessionId(userId, req.userIp);
        ConversationManager.mapUserToSession(userId, newSessionId);
        const restoredMessages = restoreChat(log);
        ConversationManager.saveHistory(newSessionId, restoredMessages);

        res.cookie('session_id', newSessionId, {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000,
            sameSite: 'strict'
        });

        res.json({sessionId: newSessionId, messages: restoredMessages});
    } catch (error) {
        console.error('Restore session error:', error);
        res.status(500).json({error: 'Failed to restore session'});
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

export const emailInteraction = async (req, res) => {
    try {
        const { userId } = req;
        const { id: sessionId } = req.params;
        const { email } = req.body;

        if (!userId) return res.status(401).json({ error: 'Unauthorized' });
        if (!email) return res.status(400).json({ error: 'Email address is required' });

        const log = await InteractionLog.findOne({ sessionId, userId }).select('messages');
        if (!log) return res.status(404).json({ error: 'Session not found' });

        const formattedTranscript = log.messages
            .filter(msg => msg.role !== 'system')
            .map(msg => {
                const role = msg.role === 'user' ? 'User' : 'AI';
                const content = msg.parts?.map(p => p.text || '').join('').trim();
                return `[${role}]: ${content}`;
            })
            .join('\n\n');

        const result = await sendEmail(email, 'Your Chat History', formattedTranscript, null);

        if (result.error) {
            return res.status(500).json({ error: result.error });
        }

        res.json({ success: true, message: 'Email sent successfully' });
    } catch (error) {
        console.error('Email session error:', error);
        res.status(500).json({ error: 'Failed to send email' });
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

export const restoreChat = (log) => {
    return log.messages.map(msg => {
        const role = msg.role === 'model' ? 'assistant' : msg.role;
        const content = msg.parts?.map(p => p.text || '').join('').trim() || '[Restored Content]';

        return {role, content};
    });
}