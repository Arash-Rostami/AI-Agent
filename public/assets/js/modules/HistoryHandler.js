import BaseHandler from './BaseHandler.js';

export default class HistoryHandler extends BaseHandler {
    constructor() {
        super();

        this.historyBtn = document.getElementById('history-btn');
        this.modal = document.getElementById('history-modal');
        this.closeBtn = document.getElementById('close-history-btn');
        this.listContainer = document.getElementById('history-list');
        this.detailsContainer = document.getElementById('history-details');
        this.messagesContainer = document.getElementById('history-messages');
        this.backBtn = document.getElementById('back-to-list-btn');
        this.pdfBtn = document.getElementById('pdf-btn');
        this.printBtn = document.getElementById('print-btn');

        this.init();
    }

    init() {
        if (!this.historyBtn || !this.modal) return;

        this.historyBtn.addEventListener('click', () => this.openHistory());
        this.closeBtn.addEventListener('click', () => this.closeHistory());
        this.backBtn.addEventListener('click', () => this.showList());

        if (this.pdfBtn) {
            this.pdfBtn.innerHTML = '<i class="fas fa-file-pdf"></i>';
            this.pdfBtn.title = 'Export as PDF';
            this.pdfBtn.addEventListener('click', () => this.exportToPDF());
        }
        if (this.printBtn) {
            this.printBtn.innerHTML = '<i class="fas fa-print"></i>';
            this.printBtn.title = 'Print History';
            this.printBtn.addEventListener('click', () => this.printHistory());
        }

        if (this.backBtn) {
            this.backBtn.innerHTML = '<i class="fas fa-arrow-left"></i>';
            this.backBtn.title = 'Back to List';
        }

        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.closeHistory();
        });
    }

    printHistory() {
        const printWindow = window.open('', '_blank');
        const preview = this.getPreviewFromDOM() || this.currentSessionId || 'Export';
        const title = `Chat History - ${preview}`;
        const content = this.messagesContainer.innerHTML;

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>${title}</title>
                <style>
                    body { font-family: system-ui, sans-serif; padding: 20px; line-height: 1.6; }
                    .message { margin-bottom: 20px; display: flex; }
                    .message.user { flex-direction: row-reverse; }
                    .message-avatar { width: 40px; height: 40px; border-radius: 50%; background: var(--primary-color, #007bff); color: white; display: flex; align-items: center; justify-content: center; margin: 0 10px; flex-shrink: 0; }
                    .message-wrapper { max-width: 80%; }
                    .message-content { padding: 12px 16px; border-radius: 18px; background: #f0f0f0; }
                    .message.ai .message-content { background: #e3f2fd; }
                    .message.user .message-content { background: #007bff; color: white; }
                    .rtl { direction: rtl; text-align: right; }
                    @media print {
                        body { padding: 0; }
                    }
                </style>
            </head>
            <body>
                <h2>${title}</h2>
                <div class="messages">${content}</div>
            </body>
            </html>
        `);

        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    }

    getPreviewFromDOM() {
        const firstUser = this.messagesContainer.querySelector('.message.user .message-content');
        if (!firstUser) return '';
        const text = firstUser.textContent.trim();
        return text.substring(0, 50) + (text.length > 50 ? '...' : '');
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
        requestAnimationFrame(() => {
            this.detailsContainer.classList.add('active');
        });
    }

    async loadHistoryList() {
        this.listContainer.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';

        try {
            const response = await fetch('/api/history', {
                headers: {
                    'X-User-Id': this.userId,
                    'X-Frame-Referer': this.parentOrigin
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
                let previewText = this.formatter.excludeQuotationMarks(item.preview || '');

                el.innerHTML = `
                    <div class="history-content-wrapper">
                        <span class="history-date">${time}</span>
                        <div class="history-preview">${this.formatter.escapeHtml(previewText)}</div>
                    </div>
                    <button class="delete-history-btn" title="Delete Chat"><i class="fas fa-trash"></i></button>
                `;

                const deleteBtn = el.querySelector('.delete-history-btn');
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.confirmDelete(item.sessionId, el);
                });
                el.addEventListener('click', () => this.loadSessionDetails(item.sessionId));
                this.listContainer.appendChild(el);
            });
        }
    }

    async confirmDelete(sessionId, element) {
        if (confirm('⚠️ Are you sure you want to delete this chat session? This action cannot be undone.')) {
            try {
                const response = await fetch(`/api/history/${sessionId}`, {
                    method: 'DELETE',
                    headers: {
                        'X-User-Id': this.userId,
                        'X-Frame-Referer': this.parentOrigin
                    }
                });

                if (response.ok) {
                    element.remove();
                    if (this.currentSessionId === sessionId) {
                        this.showList();
                        this.currentSessionId = null;
                    }
                } else {
                    alert(`Failed to delete history. Status: ${response.status}`);
                }
            } catch (err) {
                console.error('Delete error:', err);
                alert('An error occurred while deleting.');
            }
        }
    }

    groupHistoryByDate(history) {
        const groups = {};
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();

        history.forEach(item => {
            const date = new Date(item.createdAt).toDateString();
            let label = date;
            if (date === today) label = 'Today'; else if (date === yesterday) label = 'Yesterday';

            if (!groups[label]) groups[label] = [];
            groups[label].push(item);
        });
        return groups;
    }

    async loadSessionDetails(sessionId) {
        this.currentSessionId = sessionId;
        this.showDetails();
        this.messagesContainer.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading chat...</div>';

        try {
            const response = await fetch(`/api/history/${sessionId}`, {
                headers: {
                    'X-User-Id': this.userId,
                    'X-Frame-Referer': this.parentOrigin
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
        this.messagesContainer.classList.add('messages');

        messages.forEach(msg => {
            if (msg.role === 'system') return;

            const msgEl = document.createElement('div');
            msgEl.className = `message ${msg.role === 'user' ? 'user' : 'ai'}`;

            const avatar = this.formatter.createAvatar(msg.role === 'user' ? 'user' : 'ai');

            const contentWrapper = document.createElement('div');
            contentWrapper.className = 'message-wrapper';

            const contentEl = document.createElement('div');
            contentEl.className = 'message-content';

            let text = this.formatter.excludeQuotationMarks(msg.parts && msg.parts[0] ? msg.parts[0].text : '');

            contentEl.innerHTML = this.formatter.format(text);

            if (msg.role === 'model' || msg.role === 'assistant') {
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

    async exportToPDF() {
        const element = this.messagesContainer;
        if (!element) return;

        await this.ensureHtml2Pdf();
        const preview = this.getPreviewFromDOM() || this.currentSessionId || 'export';
        const safeFilename = preview.replace(/\W+/g, '_').toLowerCase();

        const opt = {
            margin: [10, 10, 10, 10],
            filename: `chat-history-${safeFilename}.pdf`,
            image: {type: 'jpeg', quality: 0.98},
            html2canvas: {scale: 2, useCORS: true, logging: false},
            jsPDF: {unit: 'mm', format: 'a4', orientation: 'portrait'}
        };

        element.classList.add('pdf-mode');

        window.html2pdf().set(opt).from(element).save().finally(() => {
            element.classList.remove('pdf-mode');
        });
    }

    ensureHtml2Pdf() {
        if (this._html2pdfPromise) return this._html2pdfPromise;

        this._html2pdfPromise = new Promise((resolve, reject) => {
            if (window.html2pdf) return resolve(window.html2pdf);

            const s = document.createElement('script');
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
            s.async = true;
            s.onload = () => resolve(window.html2pdf);
            s.onerror = reject;

            document.head.appendChild(s);
        });

        return this._html2pdfPromise;
    }
}