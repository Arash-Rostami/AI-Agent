export default class ThemeToggle {
    constructor(toggleId) {
        this.toggle = document.getElementById(toggleId);
        if (!this.toggle) return;

        this.icon = this.toggle.querySelector('i');
        this.init();
    }

    init() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        const root = document.documentElement;

        root.setAttribute('data-theme', savedTheme);
        this.updateIcon(savedTheme);

        this.toggle.addEventListener('click', () => this.toggleTheme(root));
    }

    toggleTheme(root) {
        const currentTheme = root.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

        root.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        this.updateIcon(newTheme);
    }

    updateIcon(theme) {
        this.icon.className = theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
    }
}
