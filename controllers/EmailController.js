import {sendChatHistory} from '../services/emailTool.js';
import InteractionLog from '../models/InteractionLog.js';
import {ConversationManager} from '../utils/conversationManager.js';

export const emailInteraction = async (req, res) => {
    try {
        const {userId} = req;
        const {id: sessionId} = req.params;
        const {email} = req.body;

        if (!userId) return res.status(401).json({error: 'Unauthorized'});
        if (!email) return res.status(400).json({error: 'Email address is required'});

        let messages = [];
        const log = await InteractionLog.findOne({sessionId, userId}).select('messages');

        if (log) {
            messages = log.messages;
        } else {
            const memoryHistory = ConversationManager.getHistory(sessionId);
            if (memoryHistory && memoryHistory.length > 0) {
                messages = memoryHistory;
            } else {
                return res.status(404).json({error: 'Session not found'});
            }
        }

        const validMessages = messages.filter(msg => msg.role !== 'system');
        const result = await sendChatHistory(email, 'Your Chat History', validMessages, null);

        if (result.error) return res.status(500).json({error: result.error});

        res.json({success: true, message: 'Email sent successfully'});
    } catch (error) {
        console.error('Email session error:', error);
        res.status(500).json({error: 'Failed to send email'});
    }
};
