class FontSizeHandler {
    constructor() {
        this.scales = [0.85, 1, 1.15, 1.3];
        this.currentIndex = 1;

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
        }
        this.updateButtons();
    }

    setupListeners() {
        const increaseBtn = document.getElementById('font-increase');
        const decreaseBtn = document.getElementById('font-decrease');

        increaseBtn?.addEventListener('click', () => this.increase());
        decreaseBtn?.addEventListener('click', () => this.decrease());
    }

    increase() {
        if (this.currentIndex < this.scales.length - 1) {
            this.currentIndex++;
            this.applyScale(this.scales[this.currentIndex]);
        }
    }

    decrease() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.applyScale(this.scales[this.currentIndex]);
        }
    }

    applyScale(scale) {
        document.documentElement.style.setProperty('--font-scale', scale);
        localStorage.setItem('fontScale', scale);
        this.updateButtons();
    }

    updateButtons() {
        const increaseBtn = document.getElementById('font-increase');
        const decreaseBtn = document.getElementById('font-decrease');

        if (increaseBtn) increaseBtn.disabled = this.currentIndex >= this.scales.length - 1;
        if (decreaseBtn) decreaseBtn.disabled = this.currentIndex <= 0;
    }
}

export default FontSizeHandler;