import MessageFormatter from './MessageFormatter.js';

export default class HistoryHandler {
    constructor() {
        this.historyBtn = document.getElementById('history-btn');
        this.modal = document.getElementById('history-modal');
        this.closeBtn = document.getElementById('close-history-btn');
        this.listContainer = document.getElementById('history-list');
        this.detailsContainer = document.getElementById('history-details');
        this.messagesContainer = document.getElementById('history-messages');
        this.backBtn = document.getElementById('back-to-list-btn');
        this.pdfBtn = document.getElementById('pdf-btn');

        this.formatter = new MessageFormatter();
        this.init();
    }

    init() {
        if (!this.historyBtn || !this.modal) return;

        this.historyBtn.addEventListener('click', () => this.openHistory());
        this.closeBtn.addEventListener('click', () => this.closeHistory());
        this.backBtn.addEventListener('click', () => this.showList());

        if (this.pdfBtn) {
            this.pdfBtn.addEventListener('click', () => this.exportToPDF());
        }

        // Close on click outside (only if clicking the overlay, not the sidebar content)
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.closeHistory();
        });
    }

    async openHistory() {
        this.modal.classList.add('active');
        this.modal.classList.remove('hidden');
        this.showList();
        await this.loadHistoryList();
    }

    closeHistory() {
        this.modal.classList.remove('active');
        setTimeout(() => {
            this.modal.classList.add('hidden');
            this.detailsContainer.classList.remove('active');
            this.detailsContainer.classList.add('hidden');
        }, 300);
    }

    showList() {
        this.detailsContainer.classList.remove('active');
        this.detailsContainer.classList.add('hidden');
        this.listContainer.classList.remove('hidden');
    }

    showDetails() {
        this.detailsContainer.classList.remove('hidden');
        // Small delay to allow display:flex to apply before transition
        requestAnimationFrame(() => {
            this.detailsContainer.classList.add('active');
        });
    }

    async loadHistoryList() {
        this.listContainer.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';

        try {
            const response = await fetch('/api/history', {
                headers: {
                    'X-User-Id': this.getUserId()
                }
            });

            if (!response.ok) throw new Error('Failed to load history');

            const {history} = await response.json();

            if (!history || history.length === 0) {
                this.listContainer.innerHTML = '<div class="history-item" style="cursor: default; text-align: center;">No history found.</div>';
                return;
            }

            this.renderList(history);
        } catch (error) {
            console.error('History load error:', error);
            this.listContainer.innerHTML = '<div class="error-message">Failed to load history.</div>';
        }
    }

    renderList(history) {
        this.listContainer.innerHTML = '';

        const grouped = this.groupHistoryByDate(history);

        for (const [dateLabel, items] of Object.entries(grouped)) {
            const groupHeader = document.createElement('div');
            groupHeader.className = 'history-date-header';
            groupHeader.style.padding = '0.5rem 0.5rem';
            groupHeader.style.color = 'var(--primary-color)';
            groupHeader.style.fontWeight = 'bold';
            groupHeader.style.fontSize = '0.85rem';
            groupHeader.textContent = dateLabel;
            this.listContainer.appendChild(groupHeader);

            items.forEach(item => {
                const el = document.createElement('div');
                el.className = 'history-item';
                const time = new Date(item.createdAt).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});

                el.innerHTML = `
                    <span class="history-date">${time}</span>
                    <div class="history-preview">${this.escapeHtml(item.preview)}</div>
                `;
                el.addEventListener('click', () => this.loadSessionDetails(item.sessionId));
                this.listContainer.appendChild(el);
            });
        }
    }

    groupHistoryByDate(history) {
        const groups = {};
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();

        history.forEach(item => {
            const date = new Date(item.createdAt).toDateString();
            let label = date;
            if (date === today) label = 'Today';
            else if (date === yesterday) label = 'Yesterday';

            if (!groups[label]) groups[label] = [];
            groups[label].push(item);
        });
        return groups;
    }

    async loadSessionDetails(sessionId) {
        this.currentSessionId = sessionId; // Store for PDF export name
        this.showDetails();
        this.messagesContainer.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading chat...</div>';

        try {
            const response = await fetch(`/api/history/${sessionId}`, {
                headers: {
                    'X-User-Id': this.getUserId()
                }
            });

            if (!response.ok) throw new Error('Failed to load details');

            const {messages} = await response.json();
            this.renderMessages(messages);
        } catch (error) {
            console.error('Details load error:', error);
            this.messagesContainer.innerHTML = '<div class="error-message">Failed to load chat details.</div>';
        }
    }

    renderMessages(messages) {
        this.messagesContainer.innerHTML = '';
        messages.forEach(msg => {
            if (msg.role === 'system') return;

            const msgEl = document.createElement('div');
            msgEl.className = `message ${msg.role === 'user' ? 'user' : 'ai'}`;

            const avatar = document.createElement('div');
            avatar.className = 'message-avatar';
            avatar.innerHTML = msg.role === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';

            const contentWrapper = document.createElement('div');
            contentWrapper.className = 'message-wrapper';

            const contentEl = document.createElement('div');
            contentEl.className = 'message-content';

            // Check if parts array exists and has text
            const text = (msg.parts && msg.parts.length > 0 && msg.parts[0].text)
                ? msg.parts[0].text
                : '';

            // Use the MessageFormatter here
            contentEl.innerHTML = this.formatter.format(text);

            if (msg.role === 'model' || msg.role === 'assistant') {
                // Check for RTL
                if (/[\u0600-\u06FF]/.test(text)) {
                    contentEl.classList.add('rtl');
                    contentEl.dir = 'rtl';
                }
            }

            contentWrapper.appendChild(contentEl);
            msgEl.appendChild(avatar);
            msgEl.appendChild(contentWrapper);
            this.messagesContainer.appendChild(msgEl);
        });
    }

    escapeHtml(text) {
        if (!text) return '';
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    getUserId() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('user');
    }

    exportToPDF() {
        const element = this.messagesContainer;
        if (!element) return;

        if (!window.html2pdf) {
            alert('PDF generation library not loaded. Please try refreshing the page.');
            return;
        }

        const opt = {
            margin:       [10, 10, 10, 10],
            filename:     `chat-history-${this.currentSessionId || 'export'}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, useCORS: true, logging: false },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        // Add a class to handle specific PDF styling if needed
        element.classList.add('pdf-mode');

        html2pdf().set(opt).from(element).save().then(() => {
            element.classList.remove('pdf-mode');
        }).catch(err => {
            console.error('PDF Export Error:', err);
            element.classList.remove('pdf-mode');
            alert('Failed to generate PDF.');
        });
    }
}
