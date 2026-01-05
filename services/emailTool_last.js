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

    // ✏️ CHANGED: Improved HTML styling for email header
    const headerHtml = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8f9fa; padding: 20px; border-radius: 8px 8px 0 0; border-bottom: 3px solid #007bff; margin-bottom: 25px;">
            <h2 style="margin: 0; color: #2c3e50; font-size: 24px;">Chat Transcript</h2>
            <p style="margin: 8px 0 0; color: #7f8c8d; font-size: 0.95em;">Generated on: <strong>${timestamp}</strong></p>
        </div>
    `;

    const finalText = text ? (headerText + text) : text;
    // Wrap final HTML in a professional container
    const contentHtml = html ? html : (finalText ? finalText.replace(/\n/g, '<br>') : '');

    // ✏️ CHANGED: Wrapped content in a professional styled container
    const finalHtml = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 800px; margin: 0 auto; border: 1px solid #e1e4e8; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            ${headerHtml}
            <div style="padding: 0 25px 25px;">
                ${contentHtml}
            </div>
            <div style="background-color: #f8f9fa; padding: 15px; text-align: center; font-size: 0.8em; color: #95a5a6; border-top: 1px solid #e1e4e8; border-radius: 0 0 8px 8px;">
                AI Assistant | Confidential
            </div>
        </div>
    `;

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