import EmailLog from '../models/EmailLog.js';
import { sendEmailInternal } from './email/index.js';

const MAX_EMAILS_PER_HOUR = 10;

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

async function checkRateLimit(userId) {
    if (!userId) return true; // If no user ID, skip strict per-user limit (or apply global limit)

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const count = await EmailLog.countDocuments({
        userId: userId,
        createdAt: { $gt: oneHourAgo },
        status: 'success'
    });

    return count < MAX_EMAILS_PER_HOUR;
}

export async function sendEmail(to, subject, text, html, userTime) {
    if (!to || !isValidEmail(to)) return { error: "Invalid recipient email address." };

    if (!subject) return { error: "Subject is required." };

    if (!text && !html) return { error: "Email body (text or html) is required." };

    const userId = 'system_user'; // Placeholder until context injection is improved

    const isAllowed = await checkRateLimit(userId);
    if (!isAllowed) {
        console.warn(`Rate limit exceeded for user ${userId}`);
        return { error: "Rate limit exceeded. Please try again later." };
    }

    // Add Timestamp Heading - Use userTime if available, else Server Time
    // userTime comes from the prompt: "Email this chat to me (My local time is ...)"
    const timestamp = userTime || new Date().toLocaleString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short'
    });

    const headerText = `Chat Transcript - Sent: ${timestamp}\n----------------------------------------\n\n`;
    const headerHtml = `
        <div style="font-family: sans-serif; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-bottom: 20px;">
            <h2 style="margin: 0; color: #333;">Chat Transcript</h2>
            <p style="margin: 5px 0 0; color: #666; font-size: 0.9em;">Sent: ${timestamp}</p>
        </div>
    `;

    const finalSubject = subject;
    const finalText = text ? (headerText + text) : text;
    const finalHtml = html ? (headerHtml + html) : (html || finalText.replace(/\n/g, '<br>'));


    const logEntry = new EmailLog({
        userId,
        recipient: to,
        subject: finalSubject,
        status: 'pending',
        metadata: { textLength: finalText?.length, hasHtml: !!finalHtml }
    });
    await logEntry.save();

    try {
        const info = await sendEmailInternal({
            to,
            subject: finalSubject,
            text: finalText,
            html: finalHtml
        });

        logEntry.status = 'success';
        logEntry.metadata = { ...logEntry.metadata, messageId: info.messageId };
        await logEntry.save();

        return {
            success: true,
            message: `Email sent successfully to ${to}`,
            messageId: info.messageId
        };

    } catch (error) {
        logEntry.status = 'failed';
        logEntry.error = error.message;
        await logEntry.save();

        return {
            success: false,
            error: "Failed to send email. Please check the logs."
        };
    }
}
