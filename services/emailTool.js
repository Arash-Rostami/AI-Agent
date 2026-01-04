import EmailLog from '../models/EmailLog.js';
import { sendEmailInternal } from './email/transport.js';

// Configuration constants
const MAX_EMAILS_PER_HOUR = 5;

/**
 * Validates email format using regex
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Checks rate limits for a user
 * @param {string} userId
 * @returns {Promise<boolean>}
 */
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

/**
 * MCP Tool Handler for sending emails
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} text - Plain text body
 * @param {string} html - HTML body (optional)
 * @returns {Promise<Object>} - Result object (success/failure)
 */
export async function sendEmail(to, subject, text, html) {
    // 1. Validation
    if (!to || !isValidEmail(to)) {
        return { error: "Invalid recipient email address." };
    }
    if (!subject) {
        return { error: "Subject is required." };
    }
    if (!text && !html) {
        return { error: "Email body (text or html) is required." };
    }

    // Attempt to infer user ID from context if available (global variable or similar hack if not passed)
    // In this architecture, tools don't receive `req` directly.
    // We will use a placeholder or check if we can pass it via `toolHandler` later.
    // For now, we'll log as 'system' or 'anonymous' if not provided.
    // *Self-correction*: The current tool architecture doesn't pass userId to tools easily.
    // We will proceed without strict per-user rate limiting for this MVP step,
    // or rely on a global check if needed.
    const userId = 'system_user'; // Placeholder until context injection is improved

    // 2. Rate Limiting
    const isAllowed = await checkRateLimit(userId);
    if (!isAllowed) {
        console.warn(`Rate limit exceeded for user ${userId}`);
        return { error: "Rate limit exceeded. Please try again later." };
    }

    // 3. Create Pending Log
    const logEntry = new EmailLog({
        userId,
        recipient: to,
        subject,
        status: 'pending',
        metadata: { textLength: text?.length, hasHtml: !!html }
    });
    await logEntry.save();

    // 4. Send Email
    try {
        const info = await sendEmailInternal({ to, subject, text, html });

        // 5. Update Log (Success)
        logEntry.status = 'success';
        logEntry.metadata = { ...logEntry.metadata, messageId: info.messageId };
        await logEntry.save();

        return {
            success: true,
            message: `Email sent successfully to ${to}`,
            messageId: info.messageId
        };

    } catch (error) {
        // 5. Update Log (Failed)
        logEntry.status = 'failed';
        logEntry.error = error.message;
        await logEntry.save();

        return {
            success: false,
            error: "Failed to send email. Please check the logs."
        };
    }
}
