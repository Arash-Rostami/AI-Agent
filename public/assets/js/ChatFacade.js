import MessageFormatter from './MessageFormatter.js';

export default class ChatFacade {
    constructor() {
        this.messages = document.getElementById('messages');
        this.messageInput = document.getElementById('message-input');
        this.sendButton = document.getElementById('send-button');
        this.clearButton = document.getElementById('clear-button');
        this.chatForm = document.getElementById('chat-form');
        this.statusText = document.getElementById('status-text');
        this.serviceSelect = document.getElementById('service-select');
        this.webSearchBtn = document.getElementById('web-search-btn');
        this.logoutBtn = document.getElementById('logout-btn');

        this.isTyping = false;
        this.userId = this.getUserId();
        this.formatter = new MessageFormatter();

        this.init();
    }

    getUserId() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('user');
    }

    init() {
        this.setupEventListeners();
        void this.loadInitialGreeting();
        this.setupTextareaAutoResize();
    }

    setupEventListeners() {
        this.chatForm.addEventListener('submit', (e) => this.handleSubmit(e));
        this.clearButton.addEventListener('click', () => this.clearChat());
        this.messageInput.addEventListener('keydown', (e) => this.handleKeydown(e));
        this.serviceSelect.addEventListener('change', () => this.handleServiceChange());
        this.webSearchBtn.addEventListener('click', () => this.toggleWebSearch());
    }

    toggleWebSearch() {
        this.isWebSearchActive = !this.isWebSearchActive;
        this.webSearchBtn.classList.toggle('active', this.isWebSearchActive);
    }

    handleServiceChange() {
        const isGemini = this.serviceSelect.value === 'gemini';
        this.webSearchBtn.classList.toggle('hidden', !isGemini);
        if (!isGemini && this.isWebSearchActive) this.toggleWebSearch();
    }

    setupTextareaAutoResize() {
        this.messageInput.addEventListener('input', () => {
            this.messageInput.style.height = 'auto';
            this.messageInput.style.height = this.messageInput.scrollHeight + 'px';
        });
    }

    handleKeydown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void this.handleSubmit(e);
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        const message = this.messageInput.value.trim();
        const selectedService = this.serviceSelect.value;
        const useWebSearch = this.isWebSearchActive;

        if (!message || this.isTyping) return;

        this.addMessage(message, 'user');
        this.messageInput.value = '';
        this.messageInput.style.height = 'auto';
        this.setTyping(true);

        try {
            const serviceEndpoints = {
                'groq': '/ask-groq', 'openrouter': '/ask-openrouter',
                'gpt-4o': '/ask-arvan', 'deepseek': '/ask-arvan'
            };
            const modelMap = {
                'gpt-4o': 'GPT-4o-mini-4193n',
                'deepseek': 'DeepSeek-Chat-V3-0324-mbxyd'
            };

            const endpoint = serviceEndpoints[selectedService] ?? '/ask';
            const requestBody = {
                message, useWebSearch,
                ...(modelMap[selectedService] && {model: modelMap[selectedService]})
            };

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Id': this.userId,
                    'X-Frame-Referer': document.referrer
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) throw new Error('Server error');

            const data = await response.json();
            this.setTyping(false);
            this.addMessage(data.reply, 'ai', false, data.sources);
            this.updateStatus('Online', 'success');
        } catch (error) {
            this.setTyping(false);
            this.addMessage('Sorry, I encountered an error. Please try again.', 'ai', true);
            this.updateStatus('Error', 'error');
            console.error('Chat error:', error);
        }
    }

    addMessage(content, sender, isError = false, sources = []) {
        const welcomeMessage = this.messages.querySelector('.welcome-message');
        if (welcomeMessage) welcomeMessage.remove();

        const messageEl = document.createElement('div');
        messageEl.className = `message ${sender}`;

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = sender === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';

        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'message-wrapper';

        const contentEl = document.createElement('div');
        contentEl.className = 'message-content';

        if (sender === 'ai') {
            const direction = this.formatter.detectLanguageDirection(content);
            contentEl.dir = direction;
            contentEl.classList.add(direction);
            contentEl.innerHTML = this.formatter.format(content);

            const copyBtn = document.createElement('button');
            copyBtn.className = 'copy-btn';
            copyBtn.innerHTML = '<i class="fas fa-copy"></i>';
            copyBtn.title = 'Copy message';

            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(content).then(() => {
                    copyBtn.innerHTML = '<i class="fas fa-check"></i>';
                    setTimeout(() => copyBtn.innerHTML = '<i class="fas fa-copy"></i>', 2000);
                });
            });

            contentEl.appendChild(copyBtn);
        } else {
            contentEl.textContent = content;
        }

        if (isError) contentEl.style.color = '#dc2626';

        contentWrapper.appendChild(contentEl);

        if (sources?.length) {
            const sourcesEl = document.createElement('div');
            sourcesEl.className = 'message-sources';
            sourcesEl.innerHTML = '<h4>🔗 Sources:</h4>' + sources.map(source => `
                <div class="source-item">
                    <a href="${source.url}" target="_blank" rel="noopener noreferrer" title="${source.snippet || ''}">
                        <i>${source.title || source.url}</i>
                    </a>
                </div>`).join('');
            contentWrapper.appendChild(sourcesEl);
        }

        messageEl.appendChild(avatar);
        messageEl.appendChild(contentWrapper);
        this.messages.appendChild(messageEl);
        this.scrollToBottom();
    }

    setTyping(isTyping) {
        this.isTyping = isTyping;
        this.sendButton.disabled = isTyping;

        const typingIndicator = this.messages.querySelector('.typing-indicator');

        if (isTyping && !typingIndicator) {
            const typingEl = document.createElement('div');
            typingEl.className = 'message ai';
            typingEl.innerHTML = `
                <div class="message-avatar"><i class="fas fa-robot"></i></div>
                <div class="typing-indicator">
                    <div class="typing-dots">
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                        <div class="typing-dot"></div>
                    </div>
                </div>
            `;
            this.messages.appendChild(typingEl);
            this.scrollToBottom();
        } else if (!isTyping && typingIndicator) {
            typingIndicator.closest('.message').remove();
        }
    }

    async clearChat() {
        try {
            await fetch('/clear-chat', {
                method: 'POST',
                headers: {'X-User-Id': this.userId}
            });
        } catch (error) {
            console.error('Clear chat error:', error);
        }

        this.messages.innerHTML = `
            <div class="welcome-message">
                <h2>Welcome to AI Assistant <span class="spin-icon"> ֎ </span></h2>
                <p>⚡ Express JS | 👩‍💻  Arash R. </p>
            </div>
        `;
        this.updateStatus('Online', 'success');
    }

    updateStatus(text, type) {
        this.statusText.textContent = text;
        document.querySelector('.status-dot').style.background = type === 'error' ? '#dc2626' : '#10b981';
    }

    scrollToBottom() {
        this.messages.scrollTop = this.messages.scrollHeight;
    }

    async loadInitialGreeting() {
        try {
            const response = await fetch('/initial-prompt', {
                headers: {
                    'X-User-Id': this.userId,
                    'X-Frame-Referer': document.referrer
                }
            });
            const data = await response.json();
            this.addMessage(data.response, 'ai');
            this.handleRestrictedUI(data.isRestrictedMode, data.isBmsMode);
        } catch (error) {
            console.error('Failed to load initial greeting:', error);
        }
    }

    handleRestrictedUI(isRestrictedMode, isBmsMode) {
        if (isBmsMode) {
            if (this.serviceSelect) this.serviceSelect.style.display = 'none';
            const label = document.querySelector('label[for="service-select"]');
            if (label) label.style.display = 'none';
            if (this.webSearchBtn) this.webSearchBtn.style.display = 'none';
            this.isWebSearchActive = false;
        }

        if (isBmsMode || isRestrictedMode) {
            if (this.logoutBtn) this.logoutBtn.style.display = 'none';
        }
    }
}