export default class ThemeToggle {
    constructor(toggleId) {
        this.toggle = document.getElementById(toggleId);
        this.icon = document.querySelector('#' + toggleId + ' i');
        if (this.toggle) this.init();
    }

    init() {
        const saved = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', saved);
        this.icon.className = saved === 'dark' ? 'fas fa-moon' : 'fas fa-sun';

        this.toggle.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            const next = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('theme', next);
            this.icon.className = next === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
        });
    }
}
