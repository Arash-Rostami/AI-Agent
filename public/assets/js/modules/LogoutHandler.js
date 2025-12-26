export default class LogoutHandler {
    constructor(buttonId) {
        this.logoutBtn = document.getElementById(buttonId);
        if (this.logoutBtn) {
            this.logoutBtn.addEventListener('click', () => this.handleLogout());
        }
    }

    async handleLogout() {
        try {
            await fetch('/auth/logout', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'}
            });
        } catch (error) {
            console.error('Error during logout:', error);
        } finally {
            window.location.href = '/login.html';
        }
    }
}