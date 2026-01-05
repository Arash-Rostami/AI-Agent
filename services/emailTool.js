import EmailLog from '../models/EmailLog.js';
import {sendEmailInternal} from './email/index.js';
import {formatEmail, generateChatBody} from './email/formatter.js';

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
        createdAt: {$gt: oneHourAgo},
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

async function createLogEntry(to, subject, text, html) {
    const logEntry = new EmailLog({
        userId: SYSTEM_USER,
        recipient: to,
        subject,
        status: 'pending',
        metadata: {textLength: text?.length, hasHtml: !!html}
    });
    return await logEntry.save();
}

async function updateLogStatus(logEntry, status, error = null, messageId = null) {
    logEntry.status = status;
    if (error) logEntry.error = error;
    if (messageId) logEntry.metadata = {...logEntry.metadata, messageId};
    await logEntry.save();
}

export async function sendEmail(to, subject, text, html, userTime) {
    const validationError = validateRequest(to, subject, text, html);
    if (validationError) return {error: validationError};

    const isAllowed = await checkRateLimit(SYSTEM_USER);
    if (!isAllowed) {
        console.warn(`Rate limit exceeded for user ${SYSTEM_USER}`);
        return {error: "Rate limit exceeded. Please try again later."};
    }

    const timestamp = generateTimestamp(userTime);
    const {finalText, finalHtml} = formatEmail(text, html, timestamp);
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

export async function sendChatHistory(to, subject, messages, userTime) {
    const {textBody, htmlBody} = generateChatBody(messages);
    return await sendEmail(to, subject, textBody, htmlBody, userTime);
}