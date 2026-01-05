import BaseHandler from './BaseHandler.js';
import EmailHandler from './EmailHandler.js';


export default class HistoryHandler extends BaseHandler {
    constructor() {
        super();
        this.emailHandler = new EmailHandler();
        this.nextCursor = null;
        this.isLoading = false;
        this.observer = null;
        this.cacheDOMElements();
        this.init();
    }

    cacheDOMElements() {
        this.historyBtn = document.getElementById('history-btn');
        this.sidebarToggle = document.getElementById('sidebar-toggle');
        this.modal = document.getElementById('history-modal');
        this.closeBtn = document.getElementById('close-history-btn');
        this.listContainer = document.getElementById('history-list');
        this.detailsContainer = document.getElementById('history-details');
        this.messagesContainer = document.getElementById('history-messages');
        this.backBtn = document.getElementById('back-to-list-btn');
        this.continueBtn = document.getElementById('continue-chat-btn');
        this.pdfBtn = document.getElementById('pdf-btn');
        this.printBtn = document.getElementById('print-btn');
        this.emailBtn = document.getElementById('email-btn');
    }

    init() {
        if (!this.historyBtn || !this.modal) return;

        this.historyBtn.addEventListener('click', () => this.openHistory());
        this.closeBtn.addEventListener('click', () => this.closeHistory());
        this.backBtn.addEventListener('click', () => this.showList());
        this.continueBtn?.addEventListener('click', () => this.handleContinue(this.currentSessionId));
        this.emailBtn?.addEventListener('click', () => this.handleEmailHistory(this.currentSessionId));
        this.sidebarToggle?.addEventListener('click', () => this.toggleHistory());

        this.setButtonActions(this.pdfBtn, this.exportToPDF, '<i class="fas fa-file-pdf"></i>', 'Export as PDF');
        this.setButtonActions(this.printBtn, this.printHistory, '<i class="fas fa-print"></i>', 'Print History');

        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.closeHistory();
        });

        this.initInfiniteScroll();
    }

    setButtonActions(button, action, iconHTML, label) {
        if (button) {
            button.innerHTML = `${iconHTML}`;
            button.title = label;
            button.addEventListener('click', action.bind(this));
        }
    }

    initInfiniteScroll() {
        this.observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !this.isLoading && this.nextCursor) {
                this.loadHistoryList(true);
            }
        }, {
            root: this.listContainer,
            rootMargin: '100px',
            threshold: 0.1
        });
    }

    toggleHistory() {
        this.modal.classList.contains('hidden') ? this.openHistory() : this.closeHistory();
    }

    async handleContinue(sessionId) {
        if (!sessionId) return;

        try {
            const response = await fetch(`/api/history/${sessionId}/restore`, {
                method: 'POST',
                headers: {'X-User-Id': this.userId, 'X-Frame-Referer': this.parentOrigin}
            });

            if (!response.ok) throw new Error('Failed to restore session');

            const data = await response.json();
            const event = new CustomEvent('restore-chat', {
                detail: {messages: data.messages, sessionId: data.sessionId}
            });
            window.dispatchEvent(event);

            this.closeHistory();
        } catch (error) {
            console.error('Restore error:', error);
            alert('Failed to restore chat session.');
        }
    }

    async confirmDelete(sessionId, element) {
        if (confirm('⚠️ Are you sure you want to delete this chat session? This action cannot be undone.')) {
            try {
                const response = await fetch(`/api/history/${sessionId}`, {
                    method: 'DELETE',
                    headers: {'X-User-Id': this.userId, 'X-Frame-Referer': this.parentOrigin}
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

    async exportToPDF() {
        const element = this.messagesContainer;
        if (!element) return;

        await this.ensureHtml2Pdf();
        const preview = this.getPreviewFromDOM() || this.currentSessionId || 'export';
        const safeFilename = preview.replace(/\W+/g, '_').toLowerCase();

        element.classList.add('pdf-mode');

        window.html2pdf().set({
            margin: [10, 10, 10, 10],
            filename: `chat-history-${safeFilename}.pdf`,
            image: {type: 'jpeg', quality: 0.98},
            html2canvas: {scale: 2, useCORS: true, logging: false},
            jsPDF: {unit: 'mm', format: 'a4', orientation: 'portrait'}
        }).from(element).save().finally(() => element.classList.remove('pdf-mode'));
    }

    async loadHistoryList(isAppend = false) {
        if (this.isLoading) return;
        this.isLoading = true;

        if (!isAppend) {
            this.listContainer.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading...</div>';
            this.nextCursor = null;
        } else {
            this.updateSentinelState(true);
        }

        try {
            const url = new URL('/api/history', window.location.origin);
            if (isAppend && this.nextCursor) {
                url.searchParams.append('cursor', this.nextCursor);
            }

            const response = await fetch(url, {
                headers: {'X-User-Id': this.userId, 'X-Frame-Referer': this.parentOrigin}
            });

            if (!response.ok) throw new Error('Failed to load history');

            const {history, nextCursor} = await response.json();
            this.nextCursor = nextCursor;

            if (!isAppend && (!history?.length)) {
                this.listContainer.innerHTML = '<div class="history-item" style="cursor: default; text-align: center;">No history found.</div>';
                return;
            }

            this.renderList(history, isAppend);
        } catch (error) {
            console.error('History load error:', error);
            if (!isAppend) {
                this.listContainer.innerHTML = '<div class="error-message">Failed to load history.</div>';
            }
        } finally {
            this.isLoading = false;
            this.updateSentinelState(false);
        }
    }

    updateSentinelState(isLoading) {
        let sentinel = this.listContainer.querySelector('.history-sentinel');

        if (!sentinel) {
            sentinel = document.createElement('div');
            sentinel.className = 'history-sentinel';
            this.listContainer.appendChild(sentinel);
            this.observer.observe(sentinel);
        }

        if (isLoading) {
            sentinel.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        } else if (this.nextCursor) {
            sentinel.innerHTML = '';
        } else {
            sentinel.remove();
        }
    }

    async loadSessionDetails(sessionId) {
        this.currentSessionId = sessionId;
        this.messagesContainer.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Loading chat...</div>';
        this.showDetails();

        try {
            const response = await fetch(`/api/history/${sessionId}`, {
                headers: {'X-User-Id': this.userId, 'X-Frame-Referer': this.parentOrigin}
            });

            if (!response.ok) throw new Error('Failed to load details');

            const {messages} = await response.json();
            this.renderMessages(messages);
        } catch (error) {
            console.error('Details load error:', error);
            this.messagesContainer.innerHTML = '<div class="error-message">Failed to load chat details.</div>';
        }
    }

    async openHistory() {
        this.modal.classList.add('active');
        this.modal.classList.remove('hidden');
        this.sidebarToggle?.classList.add('active');
        this.showList();
        await this.loadHistoryList(false);
    }

    closeHistory() {
        this.modal.classList.remove('active');
        this.sidebarToggle?.classList.remove('active');
        setTimeout(() => {
            this.modal.classList.add('hidden');
            this.detailsContainer.classList.remove('active');
            this.detailsContainer.classList.add('hidden');
        }, 300);
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

    getPreviewFromDOM() {
        const firstUser = this.messagesContainer.querySelector('.message.user .message-content');
        if (!firstUser) return '';
        const text = firstUser.textContent.trim();
        return text.length > 50 ? text.substring(0, 50) + '...' : text;
    }

    groupHistoryByDate(history) {
        const groups = {};
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();

        history.forEach(item => {
            const date = new Date(item.createdAt).toDateString();
            const label = date === today ? 'Today' : date === yesterday ? 'Yesterday' : date;

            if (!groups[label]) groups[label] = [];
            groups[label].push(item);
        });

        return groups;
    }

    printHistory() {
        const printWindow = window.open('', '_blank');
        const preview = this.getPreviewFromDOM() || this.currentSessionId || 'Export';
        const title = `Chat History - ${preview}`;

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
                    .message-avatar { width: 40px; height: 40px; border-radius: 50%; background: #ccc; color: white; display: flex; align-items: center; justify-content: center; margin: 0 10px; flex-shrink: 0; overflow: hidden; }
                    .message-avatar img { width: 100%; height: 100%; object-fit: cover; }
                    .message-wrapper { max-width: 80%; }
                    .message-content { padding: 12px 16px; border-radius: 18px; background: #f0f0f0; }
                    .message.ai .message-content { background: #e3f2fd; }
                    .message.user .message-content { background: #007bff; color: white; }
                    .rtl { direction: rtl; text-align: right; }
                    @media print { 
                        body { padding: 0; } 
                        .message-avatar { display: none !important; }
                        .message.user .message-content { background: #eee !important; color: #000 !important; border: 1px solid #ccc; }
                        .message.ai .message-content { background: #fff !important; border: 1px solid #ccc; }
                        .message-wrapper { max-width: 100%; }
                    }
                </style>
            </head>
            <body>
                <h2>${title}</h2>
                <div class="messages">${this.messagesContainer.innerHTML}</div>
            </body>
            </html>
        `);

        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    }

    renderList(history, isAppend = false) {
        if (!isAppend) this.listContainer.innerHTML = '';

        const sentinel = this.listContainer.querySelector('.history-sentinel');
        sentinel?.remove();

        const grouped = this.groupHistoryByDate(history);
        const fragment = document.createDocumentFragment();
        const existingHeaders = this.listContainer.querySelectorAll('.history-date-header');
        const lastHeader = existingHeaders[existingHeaders.length - 1];

        for (const [dateLabel, items] of Object.entries(grouped)) {
            if (!(isAppend && lastHeader?.textContent === dateLabel)) {
                const groupHeader = document.createElement('div');
                groupHeader.className = 'history-date-header';
                groupHeader.textContent = dateLabel;
                fragment.appendChild(groupHeader);
            }

            items.forEach(item => {
                const el = document.createElement('div');
                el.className = 'history-item';
                const time = new Date(item.createdAt).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
                let previewText = this.formatter.excludeQuotationMarks(item.preview || '');
                previewText = this.formatter.cleanText(previewText);

                el.innerHTML = `
                    <div class="history-content-wrapper">
                        <span class="history-date">${time}</span>
                        <div class="history-preview">${this.formatter.escapeHtml(previewText)}</div>
                    </div>
                    <button class="delete-history-btn" title="Delete Chat"><i class="fas fa-trash"></i></button>
                `;

                el.querySelector('.delete-history-btn').addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.confirmDelete(item.sessionId, el);
                });

                el.addEventListener('click', () => this.loadSessionDetails(item.sessionId));
                fragment.appendChild(el);
            });
        }

        this.listContainer.appendChild(fragment);

        if (this.nextCursor) {
            this.updateSentinelState(false);
        }
    }

    renderMessages(messages) {
        this.messagesContainer.innerHTML = '';
        this.messagesContainer.classList.add('messages');
        const fragment = document.createDocumentFragment();

        messages.forEach(msg => {
            if (msg.role === 'system') return;

            const msgEl = document.createElement('div');
            msgEl.className = `message ${msg.role === 'user' ? 'user' : 'ai'}`;

            const avatar = this.formatter.createAvatar(msg.role === 'user' ? 'user' : 'ai');
            const contentWrapper = document.createElement('div');
            contentWrapper.className = 'message-wrapper';
            const contentEl = document.createElement('div');
            contentEl.className = 'message-content';

            const text = this.formatter.excludeQuotationMarks(msg.parts?.[0]?.text || '');
            contentEl.innerHTML = this.formatter.format(text);

            if ((msg.role === 'model' || msg.role === 'assistant') && /[\u0600-\u06FF]/.test(text)) {
                contentEl.classList.add('rtl');
                contentEl.dir = 'rtl';
            }

            contentWrapper.appendChild(contentEl);
            msgEl.appendChild(avatar);
            msgEl.appendChild(contentWrapper);
            fragment.appendChild(msgEl);
        });

        this.messagesContainer.appendChild(fragment);
    }

    showDetails() {
        this.detailsContainer.classList.remove('hidden');
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                this.detailsContainer.classList.add('active');
            });
        });
    }

    showList() {
        this.detailsContainer.classList.remove('active');
        this.detailsContainer.classList.add('hidden');
        this.listContainer.classList.remove('hidden');
    }
    async handleEmailHistory(sessionId) {
        await this.emailHandler.sendEmail(sessionId);
    }
}