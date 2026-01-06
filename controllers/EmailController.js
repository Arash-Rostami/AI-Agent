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

        const log = await InteractionLog.findOne({sessionId, userId}).select('messages').lean();
        const messages = log?.messages || ConversationManager.getHistory(sessionId);
        if (!messages || messages.length === 0) return res.status(404).json({error: 'Session not found'});

        const validMessages = messages.filter(msg => msg.role !== 'system');
        if (validMessages.length === 0) return res.status(400).json({error: 'No valid messages to send'});

        const result = await sendChatHistory(email, 'Chat History', validMessages, null);
        if (result.error) return res.status(500).json({error: result.error});

        res.json({success: true, message: 'Email sent successfully'});
    } catch (error) {
        console.error('Email session error:', error);
        res.status(500).json({error: 'Failed to send email'});
    }
};