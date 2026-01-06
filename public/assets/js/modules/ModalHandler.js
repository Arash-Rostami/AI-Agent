export default class ModalHandler {
    static instance = null;

    constructor() {
        if (ModalHandler.instance) return ModalHandler.instance;
        this.init();
        ModalHandler.instance = this;
    }

    init() {
        this.injectHTML();
        this.cacheElements();
        this.bindEvents();
    }

    injectHTML() {
        if (document.getElementById('custom-modal')) return;

        const html = `
            <div id="custom-modal" class="custom-modal">
                <div class="modal-close-icon" id="modal-close-x"></div>
                <div class="custom-modal-content">
                    <div id="modal-spinner" class="loading-spinner hidden">
                        <i class="fas fa-spinner fa-spin"></i>
                    </div>
                    <h3 id="modal-title" class="modal-title">Alert</h3>
                    <p id="modal-message" class="modal-message"></p>
                    <input type="text" id="modal-input" class="modal-input hidden" autocomplete="off">
                    <div class="modal-actions">
                        <button id="modal-cancel-btn" class="modal-btn modal-btn-cancel hidden">Cancel</button>
                        <button id="modal-confirm-btn" class="modal-btn modal-btn-confirm">OK</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
    }

    cacheElements() {
        this.modal = document.getElementById('custom-modal');
        this.closeX = document.getElementById('modal-close-x');
        this.title = document.getElementById('modal-title');
        this.message = document.getElementById('modal-message');
        this.input = document.getElementById('modal-input');
        this.cancelBtn = document.getElementById('modal-cancel-btn');
        this.confirmBtn = document.getElementById('modal-confirm-btn');
        this.spinner = document.getElementById('modal-spinner');

        this.resolve = null;
        this.reject = null;
    }

    bindEvents() {
        this.confirmBtn.addEventListener('click', () => this.handleConfirm());
        this.cancelBtn.addEventListener('click', () => this.handleCancel());
        this.closeX.addEventListener('click', () => this.handleCancel());

        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.handleConfirm();
            if (e.key === 'Escape') this.handleCancel();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('active')) {
                // Prevent closing if loading
                if (this.currentType === 'loading') return;
                this.handleCancel();
            }
        });
    }

    reset() {
        this.title.textContent = '';
        this.message.textContent = '';
        this.input.value = '';
        this.input.classList.add('hidden');
        this.cancelBtn.classList.add('hidden');
        this.confirmBtn.classList.remove('hidden');
        this.confirmBtn.textContent = 'OK';
        this.spinner.classList.add('hidden');
        this.closeX.classList.remove('hidden'); // Ensure close button is visible by default
        this.resolve = null;
        this.reject = null;
        this.currentType = null;
    }

    show(type, text, placeholder = '') {
        return new Promise((resolve, reject) => {
            this.reset();
            this.resolve = resolve;
            this.reject = reject;
            this.currentType = type;

            this.message.textContent = text;

            if (type === 'alert') {
                this.title.textContent = 'Notification';
                this.cancelBtn.classList.add('hidden');
                this.confirmBtn.textContent = 'OK';
            } else if (type === 'confirm') {
                this.title.textContent = 'Confirmation';
                this.cancelBtn.classList.remove('hidden');
                this.confirmBtn.textContent = 'Yes';
                this.cancelBtn.textContent = 'No';
            } else if (type === 'prompt') {
                this.title.textContent = 'Input Required';
                this.input.classList.remove('hidden');
                this.input.placeholder = placeholder;
                this.cancelBtn.classList.remove('hidden');
                this.confirmBtn.textContent = 'Submit';
                this.cancelBtn.textContent = 'Cancel';
            } else if (type === 'loading') {
                this.title.textContent = 'Processing';
                this.spinner.classList.remove('hidden');
                this.confirmBtn.classList.add('hidden');
                this.cancelBtn.classList.add('hidden');
                this.closeX.classList.add('hidden'); // Hide close button during loading
            }

            requestAnimationFrame(() => {
                 this.modal.classList.add('active');
            });

            if (type === 'prompt') {
                setTimeout(() => this.input.focus(), 1100);
            }
        });
    }

    close() {
        this.modal.classList.remove('active');
    }

    handleConfirm() {
        const value = this.currentType === 'prompt' ? this.input.value : true;
        if (this.resolve) this.resolve(value);
        this.close();
    }

    handleCancel() {
        const value = this.currentType === 'prompt' ? null : false;
        if (this.resolve) this.resolve(value);
        this.close();
    }

    static alert(message) {
        return new ModalHandler().show('alert', message);
    }

    static confirm(message) {
        return new ModalHandler().show('confirm', message);
    }

    static prompt(message, placeholder = '') {
        return new ModalHandler().show('prompt', message, placeholder);
    }

    static loading(message) {
        return new ModalHandler().show('loading', message);
    }

    static close() {
        new ModalHandler().close();
    }
}
