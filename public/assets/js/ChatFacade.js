export default class ChatFacade {
    constructor() {
        this.messages = document.getElementById('messages');
        this.messageInput = document.getElementById('message-input');
        this.sendButton = document.getElementById('send-button');
        this.clearButton = document.getElementById('clear-button');
        this.chatForm = document.getElementById('chat-form');
        this.themeToggle = document.getElementById('theme-toggle');
        this.statusText = document.getElementById('status-text');
        this.serviceSelect = document.getElementById('service-select');
        this.webSearchBtn = document.getElementById('web-search-btn');
        this.logoutBtn = document.getElementById('logout-btn');


        this.isTyping = false;
        this.userId = this.getUserId();

        this.init();
    }

    getUserId() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('user');
    }

    init() {
        this.setupEventListeners();
        this.setupTheme();
        void this.loadInitialGreeting();
        this.setupTextareaAutoResize();
    }

    setupEventListeners() {
        this.chatForm.addEventListener('submit', (e) => this.handleSubmit(e));
        this.clearButton.addEventListener('click', () => this.clearChat());
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
        this.messageInput.addEventListener('keydown', (e) => this.handleKeydown(e));
        this.serviceSelect.addEventListener('change', () => this.handleServiceChange());
        this.webSearchBtn.addEventListener('click', () => this.toggleWebSearch());
    }

    toggleWebSearch() {
        this.isWebSearchActive = !this.isWebSearchActive;
        (this.isWebSearchActive)
            ? this.webSearchBtn.classList.add('active')
            : this.webSearchBtn.classList.remove('active');
    }

    handleServiceChange() {
        const selectedService = this.serviceSelect.value;

        if (selectedService === 'gemini') {
            this.webSearchBtn.classList.remove('hidden');
        } else {
            this.webSearchBtn.classList.add('hidden');
            if (this.isWebSearchActive) this.toggleWebSearch();
        }
    }

    setupTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeIcon(savedTheme);
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        this.updateThemeIcon(newTheme);
    }

    updateThemeIcon(theme) {
        const icon = this.themeToggle.querySelector('i');
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
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
            (async () => {
                await this.handleSubmit(e);
            })();
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
                'groq': '/ask-groq',
                'openrouter': '/ask-openrouter',
                'gpt-4o': '/ask-arvan',
                'deepseek': '/ask-arvan'
            };
            const modelMap = {
                'gpt-4o': 'GPT-4o-mini-4193n',
                'deepseek': 'DeepSeek-Chat-V3-0324-mbxyd',
            };

            let endpoint = serviceEndpoints[selectedService] ?? '/ask';
            let requestBody = {
                message,
                useWebSearch,
                ...(modelMap[selectedService] && {model: modelMap[selectedService]}),
            };

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Id': this.userId,
                    'X-Frame-Referer': document.referrer,
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
            const direction = this.detectLanguageDirection(content);
            contentEl.dir = direction;
            contentEl.classList.add(direction);
            contentEl.innerHTML = this.formatMarkdown(content);
        } else {
            contentEl.textContent = content;
        }

        if (isError) contentEl.style.color = '#dc2626';

        contentWrapper.appendChild(contentEl);

        if (sources && sources.length > 0) {
            const sourcesEl = document.createElement('div');
            sourcesEl.className = 'message-sources';
            sourcesEl.innerHTML = '<h4>🔗 Sources:</h4>' + sources.map(source =>
                `<div class="source-item">
                    <a href="${source.url}" target="_blank" rel="noopener noreferrer" title="${source.snippet || ''}">
                    <i>${source.title || source.url}</i>                      
                    </a>
                </div>`
            ).join('');
            contentWrapper.appendChild(sourcesEl);
        }

        messageEl.appendChild(avatar);
        messageEl.appendChild(contentWrapper);

        this.messages.appendChild(messageEl);
        this.scrollToBottom();
    }

    detectLanguageDirection(text) {
        const rtlRegex = /[\u0600-\u06FF]/;
        return rtlRegex.test(text) ? 'rtl' : 'ltr';
    }

    formatMarkdown(text) {
        let html = ` ${text} `.trim();

        html = html.replace(/```(?:\w+)?\n([\s\S]+?)\n```/g, (match, code) => {
            const escapedCode = code.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return `<pre><code>${escapedCode}</code></pre>`;
        });

        const lines = html.split('\n');
        let inList = null; // Can be 'ul' or 'ol'
        const processedLines = [];

        for (const line of lines) {
            const ulMatch = line.match(/^[\*\-]\s(.*)/);
            const olMatch = line.match(/^\d+\.\s(.*)/);

            if (ulMatch) {
                if (inList !== 'ul') {
                    if (inList) processedLines.push(`</${inList}>`);
                    processedLines.push('<ul>');
                    inList = 'ul';
                }
                processedLines.push(`<li>${ulMatch[1]}</li>`);
            } else if (olMatch) {
                if (inList !== 'ol') {
                    if (inList) processedLines.push(`</${inList}>`);
                    processedLines.push('<ol>');
                    inList = 'ol';
                }
                processedLines.push(`<li>${olMatch[1]}</li>`);
            } else {
                if (inList) {
                    processedLines.push(`</${inList}>`);
                    inList = null;
                }
                processedLines.push(line);
            }
        }
        if (inList) {
            processedLines.push(`</${inList}>`);
        }
        html = processedLines.join('\n');

        html = html.replace(/^###\s(.+)/gm, '<h3>$1</h3>');
        html = html.replace(/^##\s(.+)/gm, '<h2>$1</h2>');
        html = html.replace(/^#\s(.+)/gm, '<h1>$1</h1>');
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        html = html.replace(/`(.*?)`/g, '<code>$1</code>');

        return html.split('\n\n').map(paragraph => {
            if (paragraph.startsWith('<') && paragraph.endsWith('>')) {
                return paragraph;
            }
            return paragraph ? `<p>${paragraph.replace(/\n/g, '<br>')}</p>` : '';
        }).join('');
    }

    setTyping(isTyping) {
        this.isTyping = isTyping;
        this.sendButton.disabled = isTyping;

        let typingIndicator = this.messages.querySelector('.typing-indicator');

        if (isTyping) {
            if (!typingIndicator) {
                const typingEl = document.createElement('div');
                typingEl.className = 'message ai';
                typingEl.innerHTML = `
                            <div class="message-avatar">
                                <i class="fas fa-robot"></i>
                            </div>
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
            }
        } else {
            if (typingIndicator) {
                typingIndicator.closest('.message').remove();
            }
        }
    }

    async clearChat() {
        try {
            await fetch('/clear-chat', {
                method: 'POST',
                headers: {
                    'X-User-Id': this.userId
                }
            });
        } catch (error) {
            console.error('Clear chat error:', error);
        }

        this.messages.innerHTML = `
                    <div class="welcome-message">
                        <h2>Welcome to AI Assistant 
                          <span class="spin-icon"> ֎ </span>
                        </h2>
                        <p>⚡ Express JS | 👩‍💻  Arash R. </p>
                    </div>
                `;
        this.updateStatus('Online', 'success');
    }

    updateStatus(text, type) {
        this.statusText.textContent = text;
        const dot = document.querySelector('.status-dot');
        dot.style.background = type === 'error' ? '#dc2626' : '#10b981';
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

            // Handle restricted modes
            this.handleRestrictedUI(data.isRestrictedMode, data.isBmsMode);

        } catch (error) {
            console.error('Failed to load initial greeting:', error);
        }
    }

    handleRestrictedUI(isRestrictedMode, isBmsMode) {
        // If BMS mode (specific subset of restricted), hide everything
        if (isBmsMode) {
             if (this.serviceSelect) {
                this.serviceSelect.closest('label').classList.add('hidden');
                this.serviceSelect.classList.add('hidden');
                const serviceSelectorContainer = this.serviceSelect.parentElement;
                if (serviceSelectorContainer.classList.contains('service-selector')) {
                    this.serviceSelect.style.display = 'none';
                    const label = document.querySelector('label[for="service-select"]');
                    if (label) label.style.display = 'none';
                }
            }
            if (this.webSearchBtn) {
                this.webSearchBtn.classList.add('hidden');
                this.isWebSearchActive = false;
            }
        }

        // If either Restricted OR BMS mode, hide logout button
        if ((isRestrictedMode || isBmsMode) && this.logoutBtn) {
            this.logoutBtn.style.display = 'none';
        }
    }
}