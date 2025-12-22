export default class PinHandler {
    constructor() {
        this.pinBtn = document.getElementById('pin-btn');
        this.icon = this.pinBtn ? this.pinBtn.querySelector('i') : null;
        this.init();
    }

    init() {
        if (!this.pinBtn) return;

        // Check local storage. Default is false (Unpinned)
        const isPinned = localStorage.getItem('pinnedInterface') === 'true';
        this.applyState(isPinned);

        this.pinBtn.addEventListener('click', () => this.togglePin());
    }

    togglePin() {
        const isPinned = document.body.classList.contains('pinned');
        const newState = !isPinned;

        localStorage.setItem('pinnedInterface', newState);
        this.applyState(newState);
    }

    applyState(isPinned) {
        if (isPinned) {
            document.body.classList.add('pinned');
            document.body.classList.remove('interface-unpinned');
            this.pinBtn.title = "Unpin Interface";
            // Optional: Visually indicate active state if needed, though the thumbtack context is usually enough
            this.pinBtn.classList.add('active');
        } else {
            document.body.classList.remove('pinned');
            document.body.classList.add('interface-unpinned');
            this.pinBtn.title = "Pin Interface";
            this.pinBtn.classList.remove('active');
        }
    }
}
