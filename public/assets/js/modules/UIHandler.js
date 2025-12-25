import PromptHandler from './PromptHandler.js';

export default class UIHandler {
    constructor(formatter) {
        this.formatter = formatter;

        this.header = document.querySelector('.header');
        this.messages = document.getElementById('messages');
        this.messageInput = document.getElementById('message-input');
        this.sendButton = document.getElementById('send-button');
        this.statusText = document.getElementById('status-text');
        this.fileInput = document.getElementById('file-input');
        this.filePreviewContainer = document.getElementById('file-preview-container');
        this.fileNameSpan = document.getElementById('file-name');
        this.audioPreviewContainer = document.getElementById('audio-preview-container');
        this.audioPreview = document.getElementById('audio-preview');
        this.attachmentBtn = document.getElementById('attachment-btn');
        this.micBtn = document.getElementById('mic-btn');
        this.loader = document.getElementById('initial-loader');
        this.promptSuggestions = document.getElementById('prompt-suggestions');

        this.selectedFile = null;
        this.selectedAudioBlob = null;
        this.isTyping = false;

        this.promptHandler = new PromptHandler(this.messageInput, this.promptSuggestions);
    }

    initPromptSuggestions() {
        this.promptHandler.init();
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

    clearAudioSelection() {
        this.selectedAudioBlob = null;
        this.audioPreview.src = '';
        this.audioPreviewContainer.classList.add('hidden');
    }

    clearFileSelection() {
        this.selectedFile = null;
        this.fileInput.value = '';
        this.filePreviewContainer.classList.add('hidden');
        this.fileNameSpan.textContent = '';
    }

    getIsTyping() {
        return this.isTyping;
    }

    getMessageInputValue() {
        return this.messageInput.value.trim();
    }

    getSelectedAudioBlob() {
        return this.selectedAudioBlob;
    }

    getSelectedFile() {
        return this.selectedFile;
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

    handleRestrictedUI(isRestrictedMode, isBmsMode, serviceSelect, webSearchBtn) {
        if (isBmsMode) {
            if (serviceSelect) serviceSelect.style.display = 'none';
            const label = document.querySelector('label[for="service-select"]');
            if (label) label.style.display = 'none';
            if (webSearchBtn) webSearchBtn.style.display = 'none';
        }
    }

    hideLoader() {
        if (this.loader) {
            this.loader.classList.add('fade-out');
            setTimeout(() => this.loader.remove(), 500);
        }
    }

    resetInputFade() {
        this.attachmentBtn.classList.remove('fade-out');
        if (this.micBtn) this.micBtn.classList.remove('fade-out');
    }

    resetMessageInput() {
        this.messageInput.value = '';
        this.messageInput.style.height = 'auto';
        this.resetInputFade();
    }

    resetUI() {
        this.messages.innerHTML = `
            <div class="welcome-message">
                <h2>Welcome to AI Assistant <span class="spin-icon"> ֎ </span></h2>
                <p>⚡ Express JS | 👩‍💻  Arash R. </p>
            </div>
        `;
        this.header.classList.remove('chat-active');
        this.updateStatus('Online', 'success');
    }

    scrollToBottom() {
        this.messages.scrollTop = this.messages.scrollHeight;
    }

    setAudioSelection(audioBlob) {
        this.selectedAudioBlob = audioBlob;
        this.audioPreview.src = URL.createObjectURL(audioBlob);
        this.audioPreviewContainer.classList.remove('hidden');
    }

    setFileSelection(file) {
        this.selectedFile = file;
        this.fileNameSpan.textContent = file.name;
        this.filePreviewContainer.classList.remove('hidden');
    }

    setMicRecording(isRecording) {
        if (isRecording) {
            this.micBtn.classList.add('recording');
            this.micBtn.innerHTML = '<i class="fas fa-stop"></i>';
            this.micBtn.title = "Stop Recording";
            this.messageInput.placeholder = "Recording audio...";
            this.messageInput.disabled = true;
            this.attachmentBtn.style.display = 'none';
        } else {
            this.micBtn.classList.remove('recording');
            this.micBtn.innerHTML = '<i class="fas fa-microphone"></i>';
            this.micBtn.title = "Record Audio";
            this.messageInput.placeholder = "Type your message...";
            this.messageInput.disabled = false;
            this.attachmentBtn.style.display = 'inline-block';
        }
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

    updateServiceUI(service, webSearchBtn, isWebSearchActive, toggleWebSearchCallback) {
        const isGemini = service === 'gemini';
        webSearchBtn.classList.toggle('hidden', !isGemini);
        this.micBtn.classList.toggle('hidden', !isGemini);
        if (!isGemini && isWebSearchActive) toggleWebSearchCallback();

        const supportsAttachments = ['gemini', 'gpt-4o'].includes(service);
        if (supportsAttachments) {
            this.attachmentBtn.style.display = 'inline-block';
        } else {
            this.attachmentBtn.style.display = 'none';
            this.clearFileSelection();
        }
    }

    updateStatus(text, type) {
        this.statusText.textContent = text;
        document.querySelector('.status-dot').style.background = type === 'error' ? '#dc2626' : '#10b981';
    }
}