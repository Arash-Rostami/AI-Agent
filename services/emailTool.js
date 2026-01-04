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

export async function sendEmail(to, subject, text, html) {
    if (!to || !isValidEmail(to)) return { error: "Invalid recipient email address." };

    if (!subject) return { error: "Subject is required." };

    if (!text && !html) return { error: "Email body (text or html) is required." };



    const userId = 'system_user'; // Placeholder until context injection is improved

    const isAllowed = await checkRateLimit(userId);
    if (!isAllowed) {
        console.warn(`Rate limit exceeded for user ${userId}`);
        return { error: "Rate limit exceeded. Please try again later." };
    }

    const logEntry = new EmailLog({
        userId,
        recipient: to,
        subject,
        status: 'pending',
        metadata: { textLength: text?.length, hasHtml: !!html }
    });
    await logEntry.save();

    try {
        const info = await sendEmailInternal({ to, subject, text, html });

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
