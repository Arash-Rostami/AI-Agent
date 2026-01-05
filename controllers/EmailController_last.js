import {sendEmail} from '../services/emailTool.js';
import InteractionLog from '../models/InteractionLog.js';
import {ConversationManager} from '../utils/conversationManager.js';

export const emailInteraction = async (req, res) => {
    try {
        const {userId} = req;
        const {id: sessionId} = req.params;
        const {email} = req.body;

        if (!userId) return res.status(401).json({error: 'Unauthorized'});
        if (!email) return res.status(400).json({error: 'Email address is required'});

        // ✏️ CHANGED: Implemented fallback logic: check DB first, then Memory
        let messages = [];
        const log = await InteractionLog.findOne({sessionId, userId}).select('messages');

        if (log) {
            messages = log.messages;
        } else {
            // Fallback to memory for unsaved/restored sessions
            const memoryHistory = ConversationManager.getHistory(sessionId);
            if (memoryHistory && memoryHistory.length > 0) {
                messages = memoryHistory;
            } else {
                return res.status(404).json({error: 'Session not found'});
            }
        }

        // Helper to extract text content regardless of source (DB vs Memory)
        const getText = (msg) => {
            if (msg.content) return msg.content;
            if (msg.parts) return msg.parts.map(p => p.text || '').join('').trim();
            return '';
        };

        // Plain text transcript
        const formattedTranscript = messages
            .filter(msg => msg.role !== 'system')
            .map(msg => {
                const role = (msg.role === 'user' || msg.role === 'User') ? 'User' : 'AI';
                const content = getText(msg);
                return `[${role}]: ${content}`;
            })
            .join('\n\n');

        // Helper to check for RTL characters (Arabic/Farsi/Hebrew range)
        const isRTL = (text) => /[\u0600-\u06FF\u0590-\u05FF]/.test(text);

        // ✏️ CHANGED: Added Rich HTML transcript with styles and RTL support
        const formattedHtml = messages
            .filter(msg => msg.role !== 'system')
            .map(msg => {
                const role = (msg.role === 'user' || msg.role === 'User') ? 'User' : 'AI';
                const content = getText(msg);
                const hasRtl = isRTL(content);
                const dir = hasRtl ? 'rtl' : 'ltr';
                const align = hasRtl ? 'right' : 'left';

                // Color scheme
                const bg = role === 'User' ? '#eff6ff' : '#f3f4f6'; // Light blue for user, Light gray for AI
                const borderColor = role === 'User' ? '#2563eb' : '#4b5563';
                const labelColor = role === 'User' ? '#1e40af' : '#374151';
                const icon = role === 'User' ? '&#128100;' : '&#129302;'; // 👤 : 🤖

                // Escape HTML for safety
                const safeContent = content
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;")
                    .replace(/'/g, "&#039;")
                    .replace(/\n/g, '<br>');

                return `
                    <div style="margin-bottom: 20px; direction: ${dir}; text-align: ${align};">
                        <div style="font-weight: 600; font-size: 0.85em; margin-bottom: 6px; color: ${labelColor}; text-transform: uppercase; letter-spacing: 0.5px;">
                            ${icon} ${role}
                        </div>
                        <div style="
                            background-color: ${bg};
                            color: #1f2937;
                            padding: 15px;
                            border-radius: 12px;
                            border-${dir === 'rtl' ? 'right' : 'left'}: 4px solid ${borderColor};
                            display: inline-block;
                            max-width: 90%;
                            line-height: 1.6;
                            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                        ">
                            ${safeContent}
                        </div>
                    </div>
                `;
            })
            .join('');

        const result = await sendEmail(email, 'Your Chat History', formattedTranscript, formattedHtml);

        if (result.error) return res.status(500).json({error: result.error});

        res.json({success: true, message: 'Email sent successfully'});
    } catch (error) {
        console.error('Email session error:', error);
        res.status(500).json({error: 'Failed to send email'});
    }
};