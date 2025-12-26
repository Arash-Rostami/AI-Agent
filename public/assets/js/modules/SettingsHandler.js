export default class SettingsHandler {
    constructor() {
        this.cacheDOMElements();
        this.init();
    }

    // Cache DOM elements for performance and readability
    cacheDOMElements() {
        this.settingsBtn = document.getElementById('settings-btn');
        this.modal = document.getElementById('settings-modal');
        this.closeBtn = document.getElementById('close-settings-btn');
        this.tabBtns = document.querySelectorAll('.settings-tab-btn');
        this.tabContents = document.querySelectorAll('.settings-tab-content');
        this.avatarInput = document.getElementById('settings-avatar-input');
        this.avatarPreview = document.getElementById('settings-avatar-preview');
        this.uploadBtn = document.getElementById('upload-avatar-btn');
        this.removeAvatarBtn = document.getElementById('remove-avatar-btn');
        this.triggerUploadBtn = document.getElementById('trigger-avatar-upload');
        this.currentPassword = document.getElementById('current-password');
        this.newPassword = document.getElementById('new-password');
        this.confirmPassword = document.getElementById('confirm-password');
        this.savePasswordBtn = document.getElementById('save-password-btn');
    }

    async init() {
        this.setupEventListeners();
        await this.loadUserProfile();
    }

    setupEventListeners() {
        if (this.settingsBtn) this.settingsBtn.addEventListener('click', () => this.openModal());
        if (this.closeBtn) this.closeBtn.addEventListener('click', () => this.closeModal());
        if (this.modal) this.modal.addEventListener('click', (e) => e.target === this.modal && this.closeModal());
        this.tabBtns.forEach(btn => btn.addEventListener('click', () => this.switchTab(btn.dataset.tab)));
        if (this.triggerUploadBtn) this.triggerUploadBtn.addEventListener('click', () => this.avatarInput.click());
        if (this.avatarInput) this.avatarInput.addEventListener('change', (e) => this.handleFileSelect(e));
        if (this.uploadBtn) this.uploadBtn.addEventListener('click', () => this.uploadAvatar());
        if (this.removeAvatarBtn) this.removeAvatarBtn.addEventListener('click', () => this.removeAvatar());
        if (this.savePasswordBtn) this.savePasswordBtn.addEventListener('click', (e) => this.changePassword(e));
    }

    async loadUserProfile() {
        try {
            const response = await fetch('/auth/admin');
            if (!response.ok) return;
            const data = await response.json();
            if (data.avatar) this.updateAvatarUI(data.avatar);
        } catch (error) {
            console.error('Failed to load user profile:', error);
        }
    }

    updateAvatarUI(avatarUrl) {
        const headerAvatar = document.getElementById('header-avatar');
        const headerIcon = document.getElementById('header-avatar-icon');

        this.avatarPreview.src = avatarUrl || './assets/img/avatars/user.png';

        if (avatarUrl) {
            this.toggleAvatarVisibility(true);
            if (headerAvatar) headerAvatar.src = avatarUrl;
        } else {
            this.toggleAvatarVisibility(false);
        }
    }

    toggleAvatarVisibility(isVisible) {
        const headerAvatar = document.getElementById('header-avatar');
        const headerIcon = document.getElementById('header-avatar-icon');
        const removeBtn = this.removeAvatarBtn;

        if (headerAvatar) headerAvatar.classList.toggle('hidden', !isVisible);
        if (headerIcon) headerIcon.classList.toggle('hidden', isVisible);
        if (removeBtn) removeBtn.classList.toggle('hidden', !isVisible);
    }

    openModal() {
        if (this.modal) {
            this.modal.classList.remove('hidden');
            this.clearPasswordFields();
        }
    }

    closeModal() {
        if (this.modal) this.modal.classList.add('hidden');
    }

    clearPasswordFields() {
        this.currentPassword.value = '';
        this.newPassword.value = '';
        this.confirmPassword.value = '';
    }

    switchTab(tabName) {
        this.tabBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabName));
        this.tabContents.forEach(content => content.classList.toggle('hidden', content.id !== `settings-tab-${tabName}`));
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                this.avatarPreview.src = reader.result;
                this.uploadBtn.disabled = false;
            };
            reader.readAsDataURL(file);
        }
    }

    async uploadAvatar() {
        const file = this.avatarInput.files[0];
        if (!file) return;

        this.uploadBtn.textContent = 'Uploading...';
        this.uploadBtn.disabled = true;

        try {
            const formData = new FormData();
            formData.append('avatar', file);

            const response = await fetch('/auth/upload-avatar', { method: 'POST', body: formData });
            const data = await response.json();

            if (response.ok) {
                alert('Avatar updated successfully!');
                this.updateAvatarUI(data.avatar);
            } else {
                alert(data.message || 'Upload failed');
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('An error occurred while uploading.');
        } finally {
            this.uploadBtn.textContent = 'Save Photo';
            this.uploadBtn.disabled = false;
        }
    }

    async removeAvatar() {
        if (!confirm('Are you sure you want to remove your profile photo?')) return;

        this.removeAvatarBtn.textContent = 'Removing...';
        this.removeAvatarBtn.disabled = true;

        try {
            const response = await fetch('/auth/remove-avatar', { method: 'POST' });
            const data = await response.json();

            if (response.ok) {
                alert('Avatar removed successfully!');
                this.updateAvatarUI(null);
                this.avatarInput.value = '';
            } else {
                alert(data.message || 'Removal failed');
            }
        } catch (error) {
            console.error('Removal error:', error);
            alert('An error occurred while removing.');
        } finally {
            this.removeAvatarBtn.textContent = 'Remove';
            this.removeAvatarBtn.disabled = false;
        }
    }

    async changePassword(e) {
        e.preventDefault();

        const current = this.currentPassword.value;
        const newPass = this.newPassword.value;
        const confirm = this.confirmPassword.value;

        if (!current || !newPass || !confirm) return alert('Please fill in all fields.');
        if (newPass !== confirm) return alert('New passwords do not match.');

        this.savePasswordBtn.textContent = 'Saving...';
        this.savePasswordBtn.disabled = true;

        try {
            const response = await fetch('/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword: current, newPassword: newPass })
            });

            const data = await response.json();
            if (response.ok) {
                alert('Password changed successfully!');
                this.clearPasswordFields();
            } else {
                alert(data.message || 'Failed to change password');
            }
        } catch (error) {
            console.error('Password change error:', error);
            alert('An error occurred.');
        } finally {
            this.savePasswordBtn.textContent = 'Update Password';
            this.savePasswordBtn.disabled = false;
        }
    }
}
