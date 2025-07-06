export default class ChatFacade {
    constructor() {
        this.messages = document.getElementById('messages');
        this.messageInput = document.getElementById('message-input');
        this.sendButton = document.getElementById('send-button');
        this.clearButton = document.getElementById('clear-button');
        this.chatForm = document.getElementById('chat-form');
        this.themeToggle = document.getElementById('theme-toggle');
        this.statusText = document.getElementById('status-text');

        this.conversationHistory = [];
        this.isTyping = false;

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupTheme();
        this.loadInitialGreeting();
        this.setupTextareaAutoResize();
    }

    setupEventListeners() {
        this.chatForm.addEventListener('submit', (e) => this.handleSubmit(e));
        this.clearButton.addEventListener('click', () => this.clearChat());
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
        this.messageInput.addEventListener('keydown', (e) => this.handleKeydown(e));
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
            this.handleSubmit(e);
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        const message = this.messageInput.value.trim();

        if (!message || this.isTyping) return;

        this.addMessage(message, 'user');
        this.messageInput.value = '';
        this.messageInput.style.height = 'auto';
        this.setTyping(true);

        try {
            const response = await fetch('/ask', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    message,
                    history: this.conversationHistory
                })
            });

            if (!response.ok) throw new Error('Server error');

            const data = await response.json();
            this.setTyping(false);
            this.addMessage(data.reply, 'ai');

            this.updateStatus('Online', 'success');
        } catch (error) {
            this.setTyping(false);
            this.addMessage('Sorry, I encountered an error. Please try again.', 'ai', true);
            this.updateStatus('Error', 'error');
            console.error('Chat error:', error);
        }
    }

    addMessage(content, sender, isError = false) {
        const welcomeMessage = this.messages.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }

        const messageEl = document.createElement('div');
        messageEl.className = `message ${sender}`;

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = sender === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';

        const contentEl = document.createElement('div');
        contentEl.className = 'message-content';

        if (sender === 'ai') {
            contentEl.innerHTML = this.formatMarkdown(content);
        } else {
            contentEl.textContent = content;
        }

        if (isError) {
            contentEl.style.color = '#dc2626';
        }

        messageEl.appendChild(avatar);
        messageEl.appendChild(contentEl);

        this.messages.appendChild(messageEl);
        this.scrollToBottom();

        // Update conversation history
        this.conversationHistory.push({
            role: sender === 'user' ? 'user' : 'assistant',
            content: content
        });
    }

    formatMarkdown(text) {
        // Convert **bold** to <strong>
        text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

        // Remove bullet point markers and keep the content
        text = text.replace(/^[\*\-]\s+/gm, '');

        // Convert single line breaks to <br>
        text = text.replace(/\n/g, '<br>');

        // Convert double <br> to paragraph breaks
        text = text.replace(/<br><br>/g, '</p><p>');

        // Wrap in paragraphs
        text = '<p>' + text + '</p>';

        // Clean up empty paragraphs
        text = text.replace(/<p><\/p>/g, '');

        return text;
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

    clearChat() {
        this.messages.innerHTML = `
                    <div class="welcome-message">
                        <h2>Welcome to AI Assistant</h2>
                        <p>Developed by Express JS - Start a conversation below</p>
                    </div>
                `;
        this.conversationHistory = [];
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
            const response = await fetch('/initial-prompt');
            const data = await response.json();
            this.addMessage(data.response, 'ai');
        } catch (error) {
            console.error('Failed to load initial greeting:', error);
        }
    }
}
