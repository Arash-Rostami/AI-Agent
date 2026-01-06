import ModalHandler from './ModalHandler.js';

export default class SyncHandler {
    constructor(buttonId) {
        this.button = document.getElementById(buttonId);
        if (this.button) this.init();
    }

    async init() {
        if (await this.checkVisibility()) {
            this.button.addEventListener('click', () => this.handleSync());
        }
    }

    async checkVisibility() {
        try {
            const response = await fetch('/auth/admin');
            if (response.ok) {
                const {canSync} = await response.json();
                if (canSync) {
                    this.button.style.display = 'inline-block';
                    return true;
                }
            }
        } catch (error) {
            console.error('Visibility check failed:', error);
        }

        this.button.style.display = 'none';
        return false;
    }

    async handleSync() {
        if (!await ModalHandler.confirm('Are you sure you want to rebuild the knowledge base? This may take a moment.')) return;

        const originalIcon = this.button.innerHTML;
        this.updateButtonState(true);

        try {
            const response = await fetch('/api/vector/sync', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'}
            });
            const data = await response.json();

            if (data.success) {
                await ModalHandler.alert(`Success: ${data.message}\nProcessed: ${data.data.filesProcessed} files, ${data.data.totalChunks} chunks.`);
            } else {
                await ModalHandler.alert(`Error: ${data.error || 'Unknown error occurred'}`);
            }
        } catch (error) {
            console.error('Sync failed:', error);
            await ModalHandler.alert('Failed to connect to the server.');
        } finally {
            this.updateButtonState(false, originalIcon);
        }
    }

    updateButtonState(isLoading, icon = '') {
        this.button.innerHTML = isLoading ? '<i class="fas fa-spinner fa-spin"></i>' : icon;
        this.button.disabled = isLoading;
    }
}
