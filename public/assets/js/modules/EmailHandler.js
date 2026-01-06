import BaseHandler from './BaseHandler.js';
import ModalHandler from './ModalHandler.js';

export default class EmailHandler extends BaseHandler {
    constructor() {
        super();
    }

    async sendEmail(sessionId) {
        if (!sessionId) {
            await ModalHandler.alert('No active chat session found.');
            return;
        }

        const email = await ModalHandler.prompt("Please enter your email address:", "user@example.com");
        if (!email) return;

        try {
            ModalHandler.loading('Sending email...');

            const response = await fetch(`/api/history/${sessionId}/email`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Id': this.userId,
                    'X-Frame-Referer': this.parentOrigin
                },
                body: JSON.stringify({ email })
            });

            const result = await response.json();
            if (response.ok) {
                await ModalHandler.alert('Success: ' + result.message);
            } else {
                throw new Error(result.error || 'Failed to send email');
            }
        } catch (error) {
            console.error('Email error:', error);
            await ModalHandler.alert('Error: ' + error.message);
        }
    }
}
