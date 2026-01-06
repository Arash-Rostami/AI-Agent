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

        // No separate overlay div needed as the modal itself becomes full screen
        const html = `
            <div id="custom-modal" class="custom-modal">
                <div class="modal-close-icon" id="modal-close-x"></div>
                <div class="custom-modal-content">
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

        // Cache for resolving promises
        this.resolve = null;
        this.reject = null;
    }

    bindEvents() {
        this.confirmBtn.addEventListener('click', () => this.handleConfirm());
        this.cancelBtn.addEventListener('click', () => this.handleCancel());
        this.closeX.addEventListener('click', () => this.handleCancel());

        // Allow pressing Enter in input to confirm
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.handleConfirm();
            if (e.key === 'Escape') this.handleCancel();
        });

        // Close on escape key globally when active
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('active')) {
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
        this.confirmBtn.textContent = 'OK';
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

            // Configure based on type
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
            }

            // Trigger Animation (Add active class to the modal container directly)
            // Use requestAnimationFrame to ensure DOM is ready for transition
            requestAnimationFrame(() => {
                 this.modal.classList.add('active');
            });

            // Auto-focus input for prompt after animation (wait for 1s transition)
            if (type === 'prompt') {
                setTimeout(() => this.input.focus(), 1100);
            }
        });
    }

    close() {
        this.modal.classList.remove('active');
        // CSS transition handles the closing animation (Height shrinks, then Width)
    }

    handleConfirm() {
        const value = this.currentType === 'prompt' ? this.input.value : true;
        if (this.resolve) this.resolve(value);
        this.close();
    }

    handleCancel() {
        // Confirm returns false, Prompt returns null, Alert just closes
        const value = this.currentType === 'prompt' ? null : false;
        if (this.resolve) this.resolve(value);
        this.close();
    }

    // Static API for easy replacement
    static alert(message) {
        return new ModalHandler().show('alert', message);
    }

    static confirm(message) {
        return new ModalHandler().show('confirm', message);
    }

    static prompt(message, placeholder = '') {
        return new ModalHandler().show('prompt', message, placeholder);
    }
}
