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

        // Initialize image loading optimizations
        this.initImageLoader();

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

            // Preload signup image when switching to signup view
            if (view === 'signup') this.preloadSignupImage();
        };

        document.querySelectorAll('[data-view]').forEach(btn =>
            btn.addEventListener('click', () => setView(btn.dataset.view))
        );

        document.querySelectorAll('.switch-to-signup').forEach(el => el.addEventListener('click', e => {
            e.preventDefault();
            setView('signup');
        }));
        document.querySelectorAll('.switch-to-signin').forEach(el => el.addEventListener('click', e => {
            e.preventDefault();
            setView('signin');
        }));
    }

    initImageLoader() {
        const images = document.querySelectorAll('.hero-img');

        images.forEach(img => {
            this.checkAndRevealImage(img);

            if (!img.complete) {
                img.addEventListener('load', () => this.revealImage(img), {once: true});
                img.addEventListener('error', () => this.handleImageError(img), {once: true});
            }

            if (img.decode) {
                img.decode().catch(() => {}).then(() => this.revealImage(img));
            }
        });

        this.setupImageObserver();
    }

    checkAndRevealImage(img) {
        if (img.complete && img.naturalHeight !== 0) {
            this.revealImage(img);
            return true;
        }
        return false;
    }

    revealImage(img) {
        img.classList.add('loaded');

        const parent = img.closest('.card-hero-content');
        if (parent) {
            parent.classList.add('loaded');
            parent.style.animation = 'none';
            parent.style.background = 'transparent';
        }

        if (img.decode && !img.classList.contains('decoded')) {
            img.decode().then(() => {
                img.classList.add('decoded');
                img.style.opacity = '1';
            }).catch(() => {
                img.style.opacity = '1';
            });
        } else {
            img.style.opacity = '1';
        }
    }

    handleImageError(img) {
        img.classList.add('error');
        img.style.display = 'none';

        const icon = img.nextElementSibling;
        if (icon && icon.classList.contains('hero-icon')) {
            icon.style.display = 'flex';
            icon.style.opacity = '1';
        }

        const parent = img.closest('.card-hero-content');
        if (parent) parent.classList.add('loaded');
    }

    setupImageObserver() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;

                    if (img.loading === 'lazy') {
                        img.loading = 'eager';
                        const currentSrc = img.src;
                        img.src = '';
                        img.src = currentSrc;
                    }

                    observer.unobserve(img);
                }
            });
        }, {
            rootMargin: '100px 0px',
            threshold: 0
        });

        const signupImg = document.querySelector('.signup .hero-img');
        if (signupImg) observer.observe(signupImg);
    }

    preloadSignupImage() {
        const signupImg = document.querySelector('.signup .hero-img');
        if (!signupImg) return;

        if (this.checkAndRevealImage(signupImg)) return;

        signupImg.loading = 'eager';
        signupImg.fetchpriority  = 'high';

        if (signupImg.decode) {
            signupImg.decode().then(() => this.revealImage(signupImg));
        }
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