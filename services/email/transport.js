import nodemailer from 'nodemailer';
import { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM } from '../../config/index.js';

let transporter = null;

const createTransporter = () => {
    if (transporter) return transporter;

    // Check if credentials are set (or at least HOST/PORT)
    if (!SMTP_HOST) {
        console.warn('⚠️ SMTP_HOST not set. Email service disabled.');
        return null;
    }

    transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT),
        secure: Number(SMTP_PORT) === 465, // true for 465, false for other ports
        auth: (SMTP_USER && SMTP_PASS) ? {
            user: SMTP_USER,
            pass: SMTP_PASS,
        } : undefined,
    });

    return transporter;
};

/**
 * Internal function to send email via Nodemailer
 * @param {Object} options
 * @param {string} options.to
 * @param {string} options.subject
 * @param {string} options.text
 * @param {string} options.html
 * @returns {Promise<Object>} info object from nodemailer
 */
export async function sendEmailInternal({ to, subject, text, html }) {
    const mailTransport = createTransporter();

    if (!mailTransport) {
        throw new Error('Email service is not configured (missing SMTP config).');
    }

    const mailOptions = {
        from: EMAIL_FROM,
        to,
        subject,
        text, // plain text body
        html, // html body
    };

    try {
        const info = await mailTransport.sendMail(mailOptions);
        console.log(`📧 Email sent: ${info.messageId}`);
        return info;
    } catch (error) {
        console.error('❌ Error sending email:', error);
        throw error;
    }
}
