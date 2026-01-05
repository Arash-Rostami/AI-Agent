export default class MenuHandler {
    constructor() {
        this.menuBtn = document.getElementById('user-menu-btn');
        this.dropdown = document.getElementById('user-dropdown');
        this.headerAvatar = document.getElementById('header-avatar');
        this.headerIcon = document.getElementById('header-avatar-icon');
        this.emailChatBtn = document.getElementById('email-chat-btn');

        this.init();
    }

    async init() {
        this.addAvatarErrorHandler();
        this.addMenuButtonEventListener();
        this.addDocumentClickListener();
        this.addEmailChatListener();
        this.checkRestrictedMode();
        await this.loadUserProfile();
    }

    addAvatarErrorHandler() {
        if (this.headerAvatar) {
            this.headerAvatar.addEventListener('error', () => {
                this.toggleAvatarDisplay(false);
            });
        }
    }

    addMenuButtonEventListener() {
        if (this.menuBtn && this.dropdown) {
            this.menuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleMenu();
            });
        }
    }

    addDocumentClickListener() {
        document.addEventListener('click', (e) => {
            if (!this.dropdown.contains(e.target) && !this.menuBtn.contains(e.target)) {
                this.closeMenu();
            }
        });
    }


    addEmailChatListener() {
        if (this.emailChatBtn) {
            this.emailChatBtn.addEventListener('click', async () => {
                this.closeMenu();
                await this.handleEmailActiveChat();
            });
        }
    }

    async handleEmailActiveChat() {
        const sessionId = this.getCookie('session_id');
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
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({email})
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

    getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
    }

    toggleMenu() {
        const isHidden = this.dropdown.classList.contains('hidden');
        if (isHidden) {
            this.dropdown.classList.remove('hidden');
            requestAnimationFrame(() => {
                this.dropdown.classList.add('active');
            });
        } else {
            this.closeMenu();
        }
    }

    closeMenu() {
        this.dropdown.classList.remove('active');
        setTimeout(() => {
            this.dropdown.classList.add('hidden');
        }, 300);
    }

    checkRestrictedMode() {
        if (window.self !== window.top) {
            const menuContainer = document.querySelector('.user-menu-container');
            if (menuContainer) menuContainer.style.display = 'none';
        }
    }

    async loadUserProfile() {
        try {
            const response = await fetch('/auth/admin');
            if (!response.ok) return;

            const data = await response.json();

            if (data.avatar) {
                this.updateAvatar(data.avatar);
            } else {
                this.toggleAvatarDisplay(false);
            }
        } catch (error) {
            console.error('Failed to load menu profile:', error);
        }
    }

    updateAvatar(avatarUrl) {
        if (this.headerAvatar) {
            this.headerAvatar.src = avatarUrl;
            this.headerAvatar.classList.remove('hidden');
        }
        this.toggleAvatarDisplay(true);
    }

    toggleAvatarDisplay(hasAvatar) {
        if (this.headerAvatar) {
            this.headerAvatar.classList.toggle('hidden', !hasAvatar);
        }
        if (this.headerIcon) {
            this.headerIcon.classList.toggle('hidden', hasAvatar);
        }
    }
}
