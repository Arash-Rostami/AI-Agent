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

        this.toggle.addEventListener('click', (e) => this.toggleTheme(root, e));
    }

    async toggleTheme(root, event) {
        if (!document.startViewTransition) {
            this.performThemeSwitch(root);
            return;
        }

        const x = event.clientX;
        const y = event.clientY;

        const endRadius = Math.hypot(
            Math.max(x, innerWidth - x),
            Math.max(y, innerHeight - y)
        );

        const transition = document.startViewTransition(() => {
            this.performThemeSwitch(root);
        });

        await transition.ready;

        document.documentElement.animate(
            {
                clipPath: [
                    `circle(0px at ${x}px ${y}px)`,
                    `circle(${endRadius}px at ${x}px ${y}px)`
                ]
            },
            {
                duration: 500,
                easing: 'ease-in-out',
                pseudoElement: '::view-transition-new(root)'
            }
        );
    }

    performThemeSwitch(root) {
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
