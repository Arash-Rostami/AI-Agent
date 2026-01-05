import BaseHandler from './BaseHandler.js';

export default class EmailHandler extends BaseHandler {
    constructor() {
        super();
    }

    async sendEmail(sessionId) {
        if (!sessionId) {
            alert('No active chat session found.');
            return;
        }

        const email = prompt("Please enter your email address:");
        if (!email) return;

        try {
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
                alert('Success: ' + result.message);
            } else {
                throw new Error(result.error || 'Failed to send email');
            }
        } catch (error) {
            console.error('Email error:', error);
            alert('Error: ' + error.message);
        }
    }
}
