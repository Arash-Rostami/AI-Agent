export default class LoginHandler {
    constructor(formId, errorSelector = '#error-msg') {
        this.form = document.getElementById(formId);
        this.errorMsg = document.querySelector(errorSelector);
        if (this.form) {
            this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        const username = this.form.username.value;
        const password = this.form.password.value;
        this.clearError();

        try {
            const res = await fetch('/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();

            if (res.ok) {
                window.location.href = '/';
            } else {
                this.displayError(data.message || 'Login failed');
            }
        } catch (_) {
            this.displayError('An error occurred. Please try again.');
        }
    }

    displayError(message) {
        this.errorMsg.textContent = message;
        this.errorMsg.style.display = 'block';
    }

    clearError() {
        this.errorMsg.style.display = 'none';
    }
}
