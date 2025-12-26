export default class PinHandler {
    constructor() {
        this.pinBtn = document.getElementById('pin-btn');
        if (this.pinBtn) this.init();
    }

    init() {
        const isPinned = this.getPinnedState();
        this.applyState(isPinned);

        this.pinBtn.addEventListener('click', () => this.togglePin());
    }

    getPinnedState() {
        return localStorage.getItem('pinnedInterface') === 'true';
    }

    togglePin() {
        const newState = !this.getPinnedState();
        localStorage.setItem('pinnedInterface', newState);
        this.applyState(newState);
    }

    applyState(isPinned) {
        document.body.classList.toggle('pinned', isPinned);
        document.body.classList.toggle('interface-unpinned', !isPinned);

        this.pinBtn.title = isPinned ? 'Unpin Interface' : 'Pin Interface';
        this.pinBtn.classList.toggle('active', isPinned);
    }
}
