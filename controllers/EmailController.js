import {sendEmail} from '../services/emailTool.js';
import InteractionLog from '../models/InteractionLog.js';

export const emailInteraction = async (req, res) => {
    try {
        const {userId} = req;
        const {id: sessionId} = req.params;
        const {email} = req.body;

        if (!userId) return res.status(401).json({error: 'Unauthorized'});
        if (!email) return res.status(400).json({error: 'Email address is required'});

        const log = await InteractionLog.findOne({sessionId, userId}).select('messages');
        if (!log) return res.status(404).json({error: 'Session not found'});

        const formattedTranscript = log.messages
            .filter(msg => msg.role !== 'system')
            .map(msg => {
                const role = msg.role === 'user' ? 'User' : 'AI';
                const content = msg.parts?.map(p => p.text || '').join('').trim();
                return `[${role}]: ${content}`;
            })
            .join('\n\n');

        const result = await sendEmail(email, 'Your Chat History', formattedTranscript, null);

        if (result.error) return res.status(500).json({error: result.error});

        res.json({success: true, message: 'Email sent successfully'});
    } catch (error) {
        console.error('Email session error:', error);
        res.status(500).json({error: 'Failed to send email'});
    }
};
