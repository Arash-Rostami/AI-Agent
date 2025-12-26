export default class FontSizeHandler {
    constructor() {
        this.scales = [0.85, 1, 1.15, 1.3];
        this.currentIndex = 1;

        this.increaseBtn = document.getElementById('font-increase');
        this.decreaseBtn = document.getElementById('font-decrease');

        this.init();
        this.setupListeners();
    }

    init() {
        const saved = localStorage.getItem('fontScale');
        if (saved) {
            const scale = parseFloat(saved);
            this.currentIndex = this.scales.indexOf(scale);
            if (this.currentIndex === -1) this.currentIndex = 1;
            this.applyScale(scale);
        } else {
            this.applyScale(this.scales[this.currentIndex]);
        }
        this.updateButtons();
    }

    setupListeners() {
        if (this.increaseBtn) this.increaseBtn.addEventListener('click', () => this.increase());
        if (this.decreaseBtn) this.decreaseBtn.addEventListener('click', () => this.decrease());
    }

    increase() {
        if (this.currentIndex < this.scales.length - 1) this.applyScale(this.scales[++this.currentIndex]);
    }

    decrease() {
        if (this.currentIndex > 0) this.applyScale(this.scales[--this.currentIndex]);
    }

    applyScale(scale) {
        document.documentElement.style.setProperty('--font-scale', scale);
        localStorage.setItem('fontScale', scale);
        this.updateButtons();
    }

    updateButtons() {
        if (this.increaseBtn) this.increaseBtn.disabled = this.currentIndex >= this.scales.length - 1;
        if (this.decreaseBtn) this.decreaseBtn.disabled = this.currentIndex <= 0;
    }
}
