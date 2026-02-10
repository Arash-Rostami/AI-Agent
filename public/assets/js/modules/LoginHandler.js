export default class LoginHandler {
    constructor(loginFormId = 'login-form') {
        this.card = document.querySelector('.card');
        this.loginForm = document.getElementById(loginFormId);
        this.signupForm = document.getElementById('signup-form');

        this.loginError = document.getElementById('login-error-msg');
        this.signupError = document.getElementById('signup-error-msg');

        // Set initial view
        if (this.card && !this.card.dataset.view) {
            this.card.dataset.view = 'signin';
        }

        this.init();
    }

    init() {
        // Form Submissions
        if (this.loginForm) {
            this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
        if (this.signupForm) {
            this.signupForm.addEventListener('submit', (e) => this.handleSignup(e));
        }

        // Navigation Buttons (Sidebar)
        document.querySelectorAll('[data-view]').forEach(btn => {
            btn.addEventListener('click', () => this.switchView(btn.dataset.view));
        });

        // Inline Links (Don't have an account? etc.)
        document.querySelectorAll('.switch-to-signup').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchView('signup');
            });
        });

        document.querySelectorAll('.switch-to-signin').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchView('signin');
            });
        });
    }

    switchView(view) {
        if (!this.card) return;

        // Update Card State
        this.card.dataset.view = view;

        // Update Nav Buttons Active State
        document.querySelectorAll('.card-nav button').forEach(btn => {
            if (btn.dataset.view === view) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Clear errors to avoid confusion
        this.clearErrors();
    }

    async handleLogin(e) {
        e.preventDefault();
        const username = this.loginForm.username.value;
        const password = this.loginForm.password.value;
        this.clearErrors();

        this.setLoading(this.loginForm, true);

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
                this.displayError(this.loginError, data.message || 'Login failed');
            }
        } catch (_) {
            this.displayError(this.loginError, 'An error occurred. Please try again.');
        } finally {
            this.setLoading(this.loginForm, false);
        }
    }

    async handleSignup(e) {
        e.preventDefault();
        const username = this.signupForm.username.value;
        const password = this.signupForm.password.value;
        const secretKey = this.signupForm.secretKey.value;
        this.clearErrors();

        this.setLoading(this.signupForm, true);

        try {
            const res = await fetch('/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, secretKey })
            });

            const data = await res.json();

            if (res.ok) {
                // Auto-login on success or redirect
                // Ideally, show a success message then redirect
                window.location.href = '/';
            } else {
                this.displayError(this.signupError, data.message || 'Signup failed');
            }
        } catch (_) {
            this.displayError(this.signupError, 'An error occurred. Please try again.');
        } finally {
            this.setLoading(this.signupForm, false);
        }
    }

    displayError(element, message) {
        if (element) {
            element.textContent = message;
            element.style.display = 'block';
            // Add shake animation class if desired, but CSS keyframes must be present
        }
    }

    clearErrors() {
        if (this.loginError) this.loginError.style.display = 'none';
        if (this.signupError) this.signupError.style.display = 'none';
    }

    setLoading(form, isLoading) {
        const btn = form.querySelector('button[type="submit"]');
        if (btn) {
            btn.disabled = isLoading;
            btn.style.opacity = isLoading ? '0.7' : '1';
            btn.textContent = isLoading ? 'Processing...' : (form === this.loginForm ? 'SIGN IN' : 'SIGN UP');
        }
    }
}
