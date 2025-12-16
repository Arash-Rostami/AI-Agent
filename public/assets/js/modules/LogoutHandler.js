export default class LogoutHandler {
    constructor(buttonId) {
        this.logoutBtn = document.getElementById(buttonId);
        if (this.logoutBtn) this.init();
    }

    init() {
        this.logoutBtn.addEventListener('click', () => this.handleLogout());
    }

    async handleLogout() {
        try {
            const response = await fetch('/auth/logout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) console.error('Logout failed');

            window.location.href = '/login.html';

        } catch (error) {
            console.error('Error during logout:', error);
        }
    }
}
