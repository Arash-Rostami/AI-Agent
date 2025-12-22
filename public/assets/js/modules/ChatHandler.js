import AudioHandler from './AudioHandler.js';
import BaseHandler from './BaseHandler.js';
import UIHandler from './UIHandler.js';

export default class ChatHandler extends BaseHandler {
    constructor() {
        super();

        this.uiHandler = new UIHandler(this.formatter);
        this.audioHandler = new AudioHandler();

        this.kebabContainer = document.querySelector('.kebab-menu-container');
        this.kebabTrigger = document.getElementById('kebab-trigger');
        this.newChatAction = document.getElementById('new-chat-action');
        this.clearChatAction = document.getElementById('clear-chat-action');
        this.chatForm = document.getElementById('chat-form');
        this.serviceSelect = document.getElementById('service-select');
        this.webSearchBtn = document.getElementById('web-search-btn');
        this.attachmentBtn = document.getElementById('attachment-btn');
        this.fileInput = document.getElementById('file-input');
        this.removeFileBtn = document.getElementById('remove-file-btn');
        this.micBtn = document.getElementById('mic-btn');
        this.removeAudioBtn = document.getElementById('remove-audio-btn');

        this.init();
    }

    init() {
        this.setupEventListeners();
        void this.loadInitialGreeting();
        this.setupTextareaAutoResize();
    }

    async handleClearChat() {
        try {
            await fetch('/clear-chat', {
                method: 'POST', headers: {'X-User-Id': this.userId}
            });
            this.uiHandler.resetUI();
            void this.loadInitialGreeting();
        } catch (error) {
            console.error('Clear chat error:', error);
        }
    }

    async handleMicClick() {
        if (!this.audioHandler.isRecording) {
            const started = await this.audioHandler.startRecording();
            if (started) {
                this.uiHandler.setMicRecording(true);
                this.uiHandler.clearFileSelection();
            }
        } else {
            const audioBlob = await this.audioHandler.stopRecording();
            this.uiHandler.setMicRecording(false);

            if (audioBlob) {
                this.uiHandler.setAudioSelection(audioBlob);
                this.uiHandler.handleInputFade();
            }
        }
    }

    async handleNewChat() {
        try {
            await fetch('/new-chat', {
                method: 'POST', headers: {'X-User-Id': this.userId}
            });
            this.uiHandler.resetUI();
            void this.loadInitialGreeting();
        } catch (error) {
            console.error('New chat error:', error);
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        const message = this.uiHandler.getMessageInputValue();
        const selectedService = this.serviceSelect.value;
        const useWebSearch = this.isWebSearchActive;

        if ((!message && !this.uiHandler.getSelectedAudioBlob()) || this.uiHandler.getIsTyping()) return;

        const selectedFile = this.uiHandler.getSelectedFile();
        const selectedAudioBlob = this.uiHandler.getSelectedAudioBlob();
        const fileName = selectedFile ? selectedFile.name : (selectedAudioBlob ? 'Voice Message' : null);

        this.uiHandler.addMessage(message, 'user', false, [], fileName);
        this.uiHandler.resetMessageInput();
        this.uiHandler.setTyping(true);

        try {
            const serviceEndpoints = {
                'groq': '/ask-groq', 'openrouter': '/ask-openrouter', 'gpt-4o': '/ask-arvan', 'deepseek': '/ask-arvan'
            };
            const modelMap = {
                'gpt-4o': 'GPT-4o-mini-4193n', 'deepseek': 'DeepSeek-Chat-V3-0324-mbxyd'
            };

            const endpoint = serviceEndpoints[selectedService] ?? '/ask';

            let body;
            const headers = {
                'X-User-Id': this.userId, 'X-Frame-Referer': this.parentOrigin
            };

            if (selectedFile || selectedAudioBlob) {
                const formData = new FormData();
                formData.append('message', message || "Voice message");
                formData.append('useWebSearch', useWebSearch);
                if (modelMap[selectedService]) {
                    formData.append('model', modelMap[selectedService]);
                }

                if (selectedFile) {
                    formData.append('file', selectedFile);
                } else if (selectedAudioBlob) {
                    const ext = selectedAudioBlob.type.includes('webm') ? 'webm' : 'mp3';
                    const audioFile = new File([selectedAudioBlob], `audio_message.${ext}`, {type: selectedAudioBlob.type});
                    formData.append('file', audioFile);
                }
                body = formData;
            } else {
                body = JSON.stringify({
                    message, useWebSearch, ...(modelMap[selectedService] && {model: modelMap[selectedService]})
                });
                headers['Content-Type'] = 'application/json';
            }

            this.uiHandler.clearFileSelection();
            this.uiHandler.clearAudioSelection();

            const response = await fetch(endpoint, {
                method: 'POST', headers, body
            });

            if (!response.ok) throw new Error('Server error');

            const data = await response.json();
            this.uiHandler.setTyping(false);
            this.uiHandler.addMessage(data.reply, 'ai', false, data.sources);
            this.uiHandler.updateStatus('Online', 'success');
        } catch (error) {
            this.uiHandler.setTyping(false);
            this.uiHandler.addMessage('Sorry, I encountered an error. Please try again.', 'ai', true);
            this.uiHandler.updateStatus('Error', 'error');
            console.error('Chat error:', error);
        }
    }

    async loadInitialGreeting() {
        try {
            const response = await fetch('/initial-prompt', {
                headers: {
                    'X-User-Id': this.userId, 'X-Frame-Referer': this.parentOrigin
                }
            });
            const data = await response.json();
            this.uiHandler.addMessage(data.response, 'ai');
            this.uiHandler.handleRestrictedUI(data.isRestrictedMode, data.isBmsMode, this.serviceSelect, this.webSearchBtn);
        } catch (error) {
            console.error('Failed to load initial greeting:', error);
        } finally {
            this.uiHandler.hideLoader();
        }
    }

    closeKebabMenu() {
        if (this.kebabContainer) this.kebabContainer.classList.remove('active');
    }

    handleFileSelect(e) {
        if (e.target.files && e.target.files[0]) {
            this.uiHandler.setFileSelection(e.target.files[0]);
        }
    }

    handleKeydown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            void this.handleSubmit(e);
        }
    }

    handleServiceChange() {
        const service = this.serviceSelect.value;
        this.uiHandler.updateServiceUI(service, this.webSearchBtn, this.isWebSearchActive, () => this.toggleWebSearch());
        if (service !== 'gemini') this.uiHandler.clearAudioSelection();
    }

    setupEventListeners() {
        this.chatForm.addEventListener('submit', (e) => this.handleSubmit(e));
        if (this.newChatAction) this.newChatAction.addEventListener('click', () => this.handleNewChat().then(() => this.closeKebabMenu()));
        if (this.clearChatAction) this.clearChatAction.addEventListener('click', () => this.handleClearChat().then(() => this.closeKebabMenu()));
        if (this.kebabTrigger) {
            this.kebabTrigger.addEventListener('click', (e) => {
                e.stopPropagation();
                this.kebabContainer.classList.toggle('active');
            });
        }
        document.addEventListener('click', (e) => {
            if (this.kebabContainer && !this.kebabContainer.contains(e.target)) this.closeKebabMenu();
        });
        this.uiHandler.messageInput.addEventListener('keydown', (e) => this.handleKeydown(e));
        this.serviceSelect.addEventListener('change', () => this.handleServiceChange());
        this.webSearchBtn.addEventListener('click', () => this.toggleWebSearch());
        this.attachmentBtn.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.removeFileBtn.addEventListener('click', () => this.uiHandler.clearFileSelection());
        this.micBtn.addEventListener('click', () => this.handleMicClick());
        this.removeAudioBtn.addEventListener('click', () => this.uiHandler.clearAudioSelection());
        this.uiHandler.messageInput.addEventListener('input', () => this.uiHandler.handleInputFade());
        this.uiHandler.messageInput.addEventListener('focus', () => this.uiHandler.handleInputFade());
        this.uiHandler.messageInput.addEventListener('blur', () => this.uiHandler.resetInputFade());
    }

    setupTextareaAutoResize() {
        this.uiHandler.messageInput.addEventListener('input', () => {
            this.uiHandler.messageInput.style.height = 'auto';
            const newHeight = this.uiHandler.messageInput.scrollHeight;
            this.uiHandler.messageInput.style.height = newHeight + 'px';

            (newHeight >= 160) ? this.uiHandler.messageInput.style.overflowY = 'auto' : this.uiHandler.messageInput.style.overflowY = 'hidden';
        });
    }

    toggleWebSearch() {
        this.isWebSearchActive = !this.isWebSearchActive;
        this.webSearchBtn.classList.toggle('active', this.isWebSearchActive);
    }
}