import BaseHandler from './BaseHandler.js';

export default class MenuHandler extends BaseHandler {
    constructor() {
        super();
        this.menuBtn = document.getElementById('user-menu-btn');
        this.dropdown = document.getElementById('user-dropdown');
        this.headerAvatar = document.getElementById('header-avatar');
        this.headerIcon = document.getElementById('header-avatar-icon');
        this.settingsBtn = document.getElementById('settings-btn');
        this.logoutBtn = document.getElementById('logout-btn');

        this.init();
    }

    async init() {
        if (this.headerAvatar) {
            this.headerAvatar.addEventListener('error', () => {
                this.headerAvatar.classList.add('hidden');
                if (this.headerIcon) this.headerIcon.classList.remove('hidden');
            });
        }

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
            requestAnimationFrame(() => {
                this.dropdown.classList.add('active');
            });
        } else {
            this.dropdown.classList.remove('active');
            setTimeout(() => {
                this.dropdown.classList.add('hidden');
            }, 300);
        }
    }

    checkRestrictedMode() {
        const isRestricted = document.cookie.split('; ').some(row => row.startsWith('restricted_ui='));

        if (isRestricted) {
            // Hide the entire container
            const menuContainer = document.querySelector('.user-menu-container');
            if (menuContainer) {
                menuContainer.style.display = 'none';
            }
        }
    }

    async loadUserProfile() {
        try {
            const response = await fetch('/auth/admin');
            if (!response.ok) return;
            const data = await response.json();

            if (data.avatar) {
                if (this.headerAvatar) {
                    this.headerAvatar.src = data.avatar;
                    this.headerAvatar.classList.remove('hidden');
                }
                if (this.headerIcon) this.headerIcon.classList.add('hidden');
            } else {
                if (this.headerAvatar) this.headerAvatar.classList.add('hidden');
                if (this.headerIcon) this.headerIcon.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Failed to load menu profile:', error);
        }
    }
}
