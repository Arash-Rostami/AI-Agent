export default class ModalHandler {
    static instance = null;

    static MODAL_CONFIG = {
        alert: {
            title: '🔔',
            confirmText: 'OK',
            cancelText: null,
            showCancel: false,
            showInput: false,
            showSpinner: false,
            hideClose: false
        },
        confirm: {
            title: '⚠️',
            confirmText: 'Yes',
            cancelText: 'No',
            showCancel: true,
            showInput: false,
            showSpinner: false,
            hideClose: false
        },
        prompt: {
            title: '✨',
            confirmText: 'Submit',
            cancelText: 'Cancel',
            showCancel: true,
            showInput: true,
            showSpinner: false,
            hideClose: false
        },
        loading: {
            title: 'Processing',
            confirmText: '',
            cancelText: '',
            showCancel: false,
            showInput: false,
            showSpinner: true,
            hideClose: true
        }
    };

    constructor() {
        if (ModalHandler.instance) return ModalHandler.instance;
        ModalHandler.instance = this;
        this.init();
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
                    <h3 id="modal-title" class="modal-title"></h3>
                    <p id="modal-message" class="modal-message"></p>
                    <input type="text" id="modal-input" class="modal-input hidden" autocomplete="off">
                    <div class="modal-actions">
                        <button id="modal-cancel-btn" class="modal-btn modal-btn-cancel hidden"></button>
                        <button id="modal-confirm-btn" class="modal-btn modal-btn-confirm"></button>
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
                if (this.currentType === 'loading') return;
                this.handleCancel();
            }
        });
    }

    show(type, text, placeholder = '') {
        return new Promise((resolve, reject) => {
            this.cleanup();

            this.resolve = resolve;
            this.reject = reject;
            this.currentType = type;

            this.updateUI(type, text, placeholder);

            requestAnimationFrame(() => {this.modal.classList.add('active');});

            if (type === 'prompt') setTimeout(() => this.input.focus(), 1100);
        });
    }

    updateUI(type, text, placeholder) {
        const config = ModalHandler.MODAL_CONFIG[type] || ModalHandler.MODAL_CONFIG.alert;

        this.message.textContent = text;
        this.title.textContent = config.title;
        this.confirmBtn.textContent = config.confirmText;

        if (config.cancelText) this.cancelBtn.textContent = config.cancelText;

        if (type === 'prompt') this.input.placeholder = placeholder;

        this.confirmBtn.classList.toggle('hidden', type === 'loading');
        this.cancelBtn.classList.toggle('hidden', !config.showCancel);
        this.input.classList.toggle('hidden', !config.showInput);
        this.spinner.classList.toggle('hidden', !config.showSpinner);
        this.closeX.classList.toggle('hidden', config.hideClose);
    }

    cleanup() {
        this.input.value = '';
        this.resolve = null;
        this.reject = null;
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
}