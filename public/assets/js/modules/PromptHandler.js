export default class PromptSuggestionsHandler {

    constructor(messageInput, promptSuggestions) {
        this.messageInput = messageInput;
        this.promptSuggestions = promptSuggestions;
        this.hideTimer = null;

        this.prompts = [
            {category: 'web_search', text: 'Search for the latest AI news.'},
            {category: 'web_search', text: 'What is the capital of France?'},
            {category: 'web_crawl', text: 'Crawl and summarize this page: [URL]'},
            {category: 'weather', text: 'What\'s the weather like in [city]?'},
            {category: 'weather', text: 'What\'s the temperature today?'},
            {category: 'weather', text: 'Forecast for [city] for the next 5 days.'},
            {category: 'weather', text: 'Check air quality in [city].'},
            {category: 'time', text: 'What time is it in [city]?'},
            {category: 'email', text: 'Email this chat to me.'}
        ];

        this.populate();
    }

    init() {
        if (window.self !== window.top) return;

        this.messageInput.addEventListener('mouseenter', () => this.show());
        this.messageInput.addEventListener('mouseleave', () => this.hideWithDelay());
        this.messageInput.addEventListener('input', () => this.handleVisibility());
        this.promptSuggestions.addEventListener('mouseenter', () => this.show());
        this.promptSuggestions.addEventListener('mouseleave', () => this.hideWithDelay());
    }

    handleVisibility() {
        if (this.messageInput.value.trim().length > 3) {
            this.promptSuggestions.classList.add('hidden');
        } else {
            this.show();
        }
    }

    populate() {
        this.promptSuggestions.innerHTML = ''
        const fragment = document.createDocumentFragment();
        this.prompts.forEach(prompt => {
            const card = document.createElement('div');
            card.className = 'prompt-card';
            card.textContent = prompt.text;
            card.dataset.prompt = prompt.text;
            card.addEventListener('click', (e) => this.select(prompt.text, e));
            fragment.appendChild(card);
        });
        this.promptSuggestions.appendChild(fragment);
    }

    show() {
        if (this.messageInput.value.trim().length <= 3) {
            this.promptSuggestions.classList.remove('hidden');
            if (this.hideTimer) clearTimeout(this.hideTimer);
        }
    }

    hideWithDelay() {
        if (this.hideTimer) clearTimeout(this.hideTimer);
        this.hideTimer = setTimeout(() => {
            if (!this.promptSuggestions.matches(':hover') && !this.messageInput.matches(':hover')) {
                this.promptSuggestions.classList.add('hidden');
            }
        }, 50);
    }

    select(promptText, e) {
        e.stopPropagation();
        this.messageInput.value = promptText;
        this.messageInput.focus();
        this.promptSuggestions.classList.add('hidden');
    }
}