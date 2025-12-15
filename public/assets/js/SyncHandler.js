export default class SyncHandler {
    constructor(buttonId) {
        this.button = document.getElementById(buttonId);
        if (this.button) {
            this.init();
        }
    }

    init() {
        // Simple logic to show button for specific users if needed,
        // or just show it for everyone as per user request "make this button available"
        // Since we don't have easy frontend access to user ID without decoding token,
        // and user asked to make it available, we will unhide it.
        // Ideally, we would decode the JWT here to check for 'arash', 'siamak', 'ata'.

        // For now, I will assume we should just show it or check a cookie if possible.
        // Let's check if the 'user' cookie exists or if we can infer logged in state.
        // But for this request, "make this button available" implies visibility.

        this.checkVisibility();
        this.button.addEventListener('click', () => this.handleSync());
    }

    checkVisibility() {
        // Attempt to read the 'user' cookie set by the server, if any.
        // Or simply show it.
        this.button.style.display = 'inline-block';
    }

    async handleSync() {
        if (!confirm('Are you sure you want to rebuild the knowledge base? This may take a moment.')) {
            return;
        }

        const originalIcon = this.button.innerHTML;
        this.button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        this.button.disabled = true;

        try {
            const response = await fetch('/api/vector/sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.success) {
                alert(`Success: ${data.message}\nProcessed: ${data.data.filesProcessed} files, ${data.data.totalChunks} chunks.`);
            } else {
                alert(`Error: ${data.error || 'Unknown error occurred'}`);
            }
        } catch (error) {
            console.error('Sync failed:', error);
            alert('Failed to connect to the server.');
        } finally {
            this.button.innerHTML = originalIcon;
            this.button.disabled = false;
        }
    }
}
