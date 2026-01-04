import EmailLog from '../models/EmailLog.js';
import { sendEmailInternal } from './email/index.js';

const MAX_EMAILS_PER_HOUR = 10;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SYSTEM_USER = 'system_user';

function validateRequest(to, subject, text, html) {
    if (!to || !EMAIL_REGEX.test(to)) return "Invalid recipient email address.";
    if (!subject) return "Subject is required.";
    if (!text && !html) return "Email body (text or html) is required.";
    return null;
}

async function checkRateLimit(userId) {
    if (!userId) return true;
    const oneHourAgo = new Date(Date.now() - 3600000);
    const count = await EmailLog.countDocuments({
        userId,
        createdAt: { $gt: oneHourAgo },
        status: 'success'
    });
    return count < MAX_EMAILS_PER_HOUR;
}

function generateTimestamp(userTime) {
    if (userTime) return userTime;
    return new Intl.DateTimeFormat('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit', timeZoneName: 'short'
    }).format(new Date());
}

function formatEmailBody(text, html, timestamp) {
    const headerText = `Requested Email - Sent: ${timestamp}\n----------------------------------------\n\n`;
    const headerHtml = `
        <div style="font-family: sans-serif; border-bottom: 2px solid #eee; padding-bottom: 10px; margin-bottom: 20px;">
            <h2 style="margin: 0; color: #333;">Requested Email</h2>
            <p style="margin: 5px 0 0; color: #666; font-size: 0.9em;">Sent: ${timestamp}</p>
        </div>
    `;

    const finalText = text ? (headerText + text) : text;
    const finalHtml = html ? (headerHtml + html) : (html || finalText.replace(/\n/g, '<br>'));

    return { finalText, finalHtml };
}

async function createLogEntry(to, subject, text, html) {
    const logEntry = new EmailLog({
        userId: SYSTEM_USER,
        recipient: to,
        subject,
        status: 'pending',
        metadata: { textLength: text?.length, hasHtml: !!html }
    });
    return await logEntry.save();
}

async function updateLogStatus(logEntry, status, error = null, messageId = null) {
    logEntry.status = status;
    if (error) logEntry.error = error;
    if (messageId) logEntry.metadata = { ...logEntry.metadata, messageId };
    await logEntry.save();
}

export async function sendEmail(to, subject, text, html, userTime) {
    const validationError = validateRequest(to, subject, text, html);
    if (validationError) return { error: validationError };

    const isAllowed = await checkRateLimit(SYSTEM_USER);
    if (!isAllowed) {
        console.warn(`Rate limit exceeded for user ${SYSTEM_USER}`);
        return { error: "Rate limit exceeded. Please try again later." };
    }

    const timestamp = generateTimestamp(userTime);
    const { finalText, finalHtml } = formatEmailBody(text, html, timestamp);
    const logEntry = await createLogEntry(to, subject, finalText, finalHtml);

    try {
        const info = await sendEmailInternal({
            to,
            subject,
            text: finalText,
            html: finalHtml
        });

        await updateLogStatus(logEntry, 'success', null, info.messageId);

        return {
            success: true,
            message: `Email sent successfully to ${to}`,
            messageId: info.messageId
        };

    } catch (error) {
        await updateLogStatus(logEntry, 'failed', error.message);
        return {
            success: false,
            error: "Failed to send email. Please check the logs."
        };
    }
}