export default class LoginHandler {
    constructor(formId, errorSelector = '#error-msg') {
        this.form = document.getElementById(formId);
        this.errorMsg = document.querySelector(errorSelector);
        if (this.form) this.init();
    }

    init() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    async handleSubmit(e) {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const res = await fetch('/auth/login', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({username, password})
            });

            const data = await res.json();

            if (res.ok) {
                window.location.href = '/';
            } else {
                this.errorMsg.textContent = data.message || 'Login failed';
                this.errorMsg.style.display = 'block';
            }
        } catch (_) {
            this.errorMsg.textContent = 'An error occurred. Please try again.';
            this.errorMsg.style.display = 'block';
        }
    }
}
