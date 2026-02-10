export default class LoginHandler {
    constructor(loginFormId) {
        this.card = document.querySelector('.card');
        this.forms = {
            signin: document.getElementById(loginFormId),
            signup: document.getElementById('signup-form')
        };
        this.errors = {
            signin: document.getElementById('login-error-msg'),
            signup: document.getElementById('signup-error-msg')
        };
        this.init();
    }

    init() {
        if (this.card && !this.card.dataset.view) this.card.dataset.view = 'signin';

        Object.entries(this.forms).forEach(([type, form]) => {
            if (form) form.addEventListener('submit', e => this.handleSubmit(e, type));
        });

        const setView = (view) => {
            if (!this.card) return;
            this.card.dataset.view = view;
            document.querySelectorAll('.card-nav button').forEach(btn =>
                btn.classList.toggle('active', btn.dataset.view === view)
            );
            Object.values(this.errors).forEach(el => el && (el.style.display = 'none'));
        };

        document.querySelectorAll('[data-view]').forEach(btn =>
            btn.addEventListener('click', () => setView(btn.dataset.view))
        );

        document.querySelectorAll('.switch-to-signup').forEach(el => el.addEventListener('click', e => { e.preventDefault(); setView('signup'); }));
        document.querySelectorAll('.switch-to-signin').forEach(el => el.addEventListener('click', e => { e.preventDefault(); setView('signin'); }));
    }

    async handleSubmit(e, type) {
        e.preventDefault();
        const form = this.forms[type];
        const btn = form.querySelector('button[type="submit"]');
        const errorEl = this.errors[type];
        const originalText = btn.textContent;

        if (errorEl) errorEl.style.display = 'none';
        btn.disabled = true;
        btn.style.opacity = '0.7';
        btn.textContent = 'Processing...';

        try {
            const res = await fetch(type === 'signin' ? '/auth/login' : '/auth/signup', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(Object.fromEntries(new FormData(form)))
            });

            const data = await res.json();
            if (res.ok) window.location.href = '/';
            else throw new Error(data.message || 'Authentication failed');
        } catch (err) {
            if (errorEl) {
                errorEl.textContent = err.message;
                errorEl.style.display = 'block';
            }
        } finally {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.textContent = originalText;
        }
    }
}
