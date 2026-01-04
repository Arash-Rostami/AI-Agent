import nodemailer from 'nodemailer';
import {EMAIL_FROM, SMTP_HOST, SMTP_PASS, SMTP_PORT, SMTP_USER} from '../../config/index.js';

let transporter = null;

const createTransporter = () => {
    if (transporter) return transporter;

    if (!SMTP_HOST) {
        console.warn('⚠️ SMTP_HOST not set. Email service disabled.');
        return null;
    }

    transporter = nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT),
        secure: Number(SMTP_PORT) === 465,
        auth: (SMTP_USER && SMTP_PASS) ? {
            user: SMTP_USER,
            pass: SMTP_PASS,
        } : undefined,
    });

    return transporter;
};

export async function sendEmailInternal({to, subject, text, html}) {
    const mailTransport = createTransporter();

    if (!mailTransport) throw new Error('Email service is not configured (missing SMTP config).');

    // Use EMAIL_FROM if set (even if it's the default), otherwise fallback to SMTP_USER
    // This ensures 'AI Assistant <noreply@...>' is used if configured, preventing raw SMTP_USER exposure
    const sender = EMAIL_FROM || SMTP_USER;

    const mailOptions = {
        from: sender,
        to,
        subject,
        text,
        html,
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
