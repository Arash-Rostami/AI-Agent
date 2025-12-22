import BaseHandler from './BaseHandler.js';

export default class MenuHandler extends BaseHandler {
    constructor() {
        super();
        this.menuBtn = document.getElementById('user-menu-btn');
        this.dropdown = document.getElementById('user-dropdown');
        this.headerAvatar = document.getElementById('header-avatar');
        this.settingsBtn = document.getElementById('settings-btn');
        this.logoutBtn = document.getElementById('logout-btn');

        this.init();
    }

    async init() {
        if (this.menuBtn && this.dropdown) {
            this.menuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleMenu();
            });

            document.addEventListener('click', (e) => {
                if (!this.dropdown.contains(e.target) && !this.menuBtn.contains(e.target)) {
                    this.dropdown.classList.remove('active');
                    this.dropdown.classList.add('hidden');
                }
            });
        }

        this.checkRestrictedMode();
        await this.loadUserProfile();
    }

    toggleMenu() {
        const isHidden = this.dropdown.classList.contains('hidden');
        if (isHidden) {
            this.dropdown.classList.remove('hidden');
            // Small delay to allow CSS transition if desired, or just toggle active
            requestAnimationFrame(() => {
                this.dropdown.classList.add('active');
            });
        } else {
            this.dropdown.classList.remove('active');
            setTimeout(() => {
                this.dropdown.classList.add('hidden');
            }, 200); // Match CSS transition duration
        }
    }

    checkRestrictedMode() {
        // Check for 'restricted_ui' cookie
        const isRestricted = document.cookie.split('; ').some(row => row.startsWith('restricted_ui='));

        if (isRestricted) {
            if (this.settingsBtn) {
                this.settingsBtn.parentElement.querySelector('.dropdown-divider').style.display = 'none'; // Hide divider above settings
                this.settingsBtn.classList.add('restricted-hidden');
            }
            // User requirement: "visible for only those who are inside the app".
            // If restricted (iframe), hide settings.

            // Note: Logout might also be hidden in restricted mode by other handlers (ChatFacade),
            // but we can enforce it here too if needed.
        }
    }

    async loadUserProfile() {
        try {
            const response = await fetch('/auth/me');
            if (!response.ok) return;
            const data = await response.json();

            if (this.headerAvatar) {
                // Set fallback with username before trying to load avatar
                const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.username || 'User')}&background=0b57d0&color=fff`;
                this.headerAvatar.onerror = () => {
                    this.headerAvatar.src = fallbackUrl;
                };

                if (data.avatar) {
                    this.headerAvatar.src = data.avatar;
                } else {
                    this.headerAvatar.src = fallbackUrl;
                }
            }
        } catch (error) {
            console.error('Failed to load menu profile:', error);
        }
    }
}
