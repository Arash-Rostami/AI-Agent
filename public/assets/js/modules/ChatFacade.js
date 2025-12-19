import MessageFormatter from './MessageFormatter.js';
import AudioHandler from './AudioHandler.js';


export default class ChatFacade {
    constructor() {
        this.header = document.querySelector('.header');
        this.messages = document.getElementById('messages');
        this.messageInput = document.getElementById('message-input');
        this.sendButton = document.getElementById('send-button');
        this.clearButton = document.getElementById('clear-button');
        this.chatForm = document.getElementById('chat-form');
        this.statusText = document.getElementById('status-text');
        this.serviceSelect = document.getElementById('service-select');
        this.webSearchBtn = document.getElementById('web-search-btn');
        this.logoutBtn = document.getElementById('logout-btn');
        this.attachmentBtn = document.getElementById('attachment-btn');
        this.fileInput = document.getElementById('file-input');
        this.filePreviewContainer = document.getElementById('file-preview-container');
        this.fileNameSpan = document.getElementById('file-name');
        this.removeFileBtn = document.getElementById('remove-file-btn');

        this.micBtn = document.getElementById('mic-btn');
        this.audioPreviewContainer = document.getElementById('audio-preview-container');
        this.audioPreview = document.getElementById('audio-preview');
        this.removeAudioBtn = document.getElementById('remove-audio-btn');

        this.isTyping = false;
        this.selectedFile = null;
        this.selectedAudioBlob = null;
        this.userId = this.getUserId();
        this.parentOrigin = this.getParentOrigin();
        this.formatter = new MessageFormatter();
        this.audioHandler = new AudioHandler();

        this.init();
    }

    getUserId() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('user');
    }

    getParentOrigin() {
        const storageKey = `parentOrigin_${this.userId || 'default'}`;
        const stored = sessionStorage.getItem(storageKey);
        if (stored) return stored;

        try {
            let origin = null;
            if (window.self !== window.top) {
                origin = window.location.ancestorOrigins?.[0] || (document.referrer ? new URL(document.referrer).origin : null);
            }
            origin = origin || window.location.origin;

            sessionStorage.setItem(storageKey, origin);
            return origin;
        } catch {
            return window.location.origin;
        }
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
        this.attachmentBtn.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.removeFileBtn.addEventListener('click', () => this.clearFileSelection());
        this.micBtn.addEventListener('click', () => this.handleMicClick());
        this.removeAudioBtn.addEventListener('click', () => this.clearAudioSelection());
        this.messageInput.addEventListener('input', () => this.handleInputFade());
        this.messageInput.addEventListener('focus', () => this.handleInputFade());
        this.messageInput.addEventListener('blur', () => {
            this.attachmentBtn.classList.remove('fade-out');
            if (this.micBtn) this.micBtn.classList.remove('fade-out');
        });
    }

    handleInputFade() {
        if (this.messageInput.value.trim().length > 0) {
            this.attachmentBtn.classList.add('fade-out');
            if (this.micBtn) this.micBtn.classList.add('fade-out');
        } else {
            this.attachmentBtn.classList.remove('fade-out');
            if (this.micBtn) this.micBtn.classList.remove('fade-out');
        }
    }

    async handleMicClick() {
        if (!this.audioHandler.isRecording) {
            const started = await this.audioHandler.startRecording();
            if (started) {
                this.micBtn.classList.add('recording');
                this.micBtn.innerHTML = '<i class="fas fa-stop"></i>';
                this.micBtn.title = "Stop Recording";
                this.messageInput.placeholder = "Recording audio...";
                this.messageInput.disabled = true;
                this.attachmentBtn.style.display = 'none';
                this.clearFileSelection();
            }
        } else {
            const audioBlob = await this.audioHandler.stopRecording();
            this.micBtn.classList.remove('recording');
            this.micBtn.innerHTML = '<i class="fas fa-microphone"></i>';
            this.micBtn.title = "Record Audio";
            this.messageInput.placeholder = "Type your message...";
            this.messageInput.disabled = false;
            this.attachmentBtn.style.display = 'inline-block';

            if (audioBlob) {
                this.selectedAudioBlob = audioBlob;
                this.audioPreview.src = URL.createObjectURL(audioBlob);
                this.audioPreviewContainer.classList.remove('hidden');
                this.handleInputFade();
            }
        }
    }

    clearAudioSelection() {
        this.selectedAudioBlob = null;
        this.audioPreview.src = '';
        this.audioPreviewContainer.classList.add('hidden');
        this.audioHandler.cancelRecording();
        if (this.micBtn.classList.contains('recording')) {
            this.micBtn.classList.remove('recording');
            this.micBtn.innerHTML = '<i class="fas fa-microphone"></i>';
            this.messageInput.placeholder = "Type your message...";
            this.messageInput.disabled = false;
        }
    }


    toggleWebSearch() {
        this.isWebSearchActive = !this.isWebSearchActive;
        this.webSearchBtn.classList.toggle('active', this.isWebSearchActive);
    }

    handleServiceChange() {
        const service = this.serviceSelect.value;
        const isGemini = service === 'gemini';
        this.webSearchBtn.classList.toggle('hidden', !isGemini);
        this.micBtn.classList.toggle('hidden', !isGemini);
        if (!isGemini && this.isWebSearchActive) this.toggleWebSearch();
        if (!isGemini) this.clearAudioSelection();

        const supportsAttachments = ['gemini', 'gpt-4o'].includes(service);
        this.attachmentBtn.style.display = supportsAttachments ? 'inline-block' : 'none';
        if (!supportsAttachments) this.clearFileSelection();
    }

    handleFileSelect(e) {
        if (e.target.files && e.target.files[0]) {
            this.selectedFile = e.target.files[0];
            this.fileNameSpan.textContent = this.selectedFile.name;
            this.filePreviewContainer.classList.remove('hidden');
        }
    }

    clearFileSelection() {
        this.selectedFile = null;
        this.fileInput.value = '';
        this.filePreviewContainer.classList.add('hidden');
        this.fileNameSpan.textContent = '';
    }

    setupTextareaAutoResize() {
        this.messageInput.addEventListener('input', () => {
            this.messageInput.style.height = 'auto';
            const newHeight = this.messageInput.scrollHeight;
            this.messageInput.style.height = newHeight + 'px';

            (newHeight >= 160)
                ? this.messageInput.style.overflowY = 'auto'
                : this.messageInput.style.overflowY = 'hidden';
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

        if ((!message && !this.selectedAudioBlob) || this.isTyping) return;

        this.addMessage(message, 'user', false, [], this.selectedFile ? this.selectedFile.name : (this.selectedAudioBlob ? 'Voice Message' : null));
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

            let body;
            const headers = {
                'X-User-Id': this.userId,
                'X-Frame-Referer': this.parentOrigin
            };

            if (this.selectedFile || this.selectedAudioBlob) {
                const formData = new FormData();
                formData.append('message', message || "Voice message");
                formData.append('useWebSearch', useWebSearch);
                if (modelMap[selectedService]) {
                    formData.append('model', modelMap[selectedService]);
                }

                if (this.selectedFile) {
                    formData.append('file', this.selectedFile);
                } else if (this.selectedAudioBlob) {
                    const ext = this.selectedAudioBlob.type.includes('webm') ? 'webm' : 'mp3';
                    const audioFile = new File([this.selectedAudioBlob], `audio_message.${ext}`, {type: this.selectedAudioBlob.type});
                    formData.append('file', audioFile);
                }
                body = formData;
            } else {
                body = JSON.stringify({
                    message, useWebSearch,
                    ...(modelMap[selectedService] && {model: modelMap[selectedService]})
                });
                headers['Content-Type'] = 'application/json';
            }

            this.clearFileSelection();
            this.clearAudioSelection();

            const response = await fetch(endpoint, {
                method: 'POST',
                headers,
                body
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

    addMessage(content, sender, isError = false, sources = [], fileName = null) {
        const welcomeMessage = this.messages.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
            this.header.classList.add('chat-active');
        }

        const messageEl = document.createElement('div');
        messageEl.className = `message ${sender}`;

        const avatar = this.formatter.createAvatar(sender);

        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'message-wrapper';

        const contentEl = document.createElement('div');
        contentEl.className = 'message-content';

        if (sender === 'ai') {
            const direction = this.formatter.detectLanguageDirection(content);
            contentEl.dir = direction;
            contentEl.classList.add(direction);
            contentEl.innerHTML = this.formatter.format(content);

            contentEl.appendChild(this.formatter.createCopyButton(content));
        } else {
            contentEl.textContent = content;
            if (fileName) contentEl.appendChild(this.formatter.createFileAttachmentTag(fileName));
        }

        if (isError) contentEl.style.color = '#dc2626';

        contentWrapper.appendChild(contentEl);

        if (sources?.length) contentWrapper.appendChild(this.formatter.createSourcesElement(sources));

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
        this.header.classList.remove('chat-active');
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
                    'X-Frame-Referer': this.parentOrigin
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