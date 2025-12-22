import BaseHandler from './BaseHandler.js';

export default class SettingsHandler extends BaseHandler {
    constructor() {
        super();

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

        this.passwordForm = document.getElementById('settings-password-form');
        this.currentPassword = document.getElementById('current-password');
        this.newPassword = document.getElementById('new-password');
        this.confirmPassword = document.getElementById('confirm-password');
        this.savePasswordBtn = document.getElementById('save-password-btn');

        this.init();
    }

    async init() {
        if (this.settingsBtn) this.settingsBtn.addEventListener('click', () => this.openModal());
        if (this.closeBtn) this.closeBtn.addEventListener('click', () => this.closeModal());

        if (this.modal) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) this.closeModal();
            });
        }

        this.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                this.switchTab(btn.dataset.tab);
            });
        });

        if (this.triggerUploadBtn) this.triggerUploadBtn.addEventListener('click', () => this.avatarInput.click());
        if (this.avatarInput) this.avatarInput.addEventListener('change', (e) => this.handleFileSelect(e));
        if (this.uploadBtn) this.uploadBtn.addEventListener('click', () => this.uploadAvatar());
        if (this.removeAvatarBtn) this.removeAvatarBtn.addEventListener('click', () => this.removeAvatar());


        if (this.savePasswordBtn) {
            this.savePasswordBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.changePassword();
            });
        }

        await this.loadUserProfile();
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
        if (this.avatarPreview) this.avatarPreview.src = avatarUrl || './assets/img/avatars/user.png';

        const headerAvatar = document.getElementById('header-avatar');
        const headerIcon = document.getElementById('header-avatar-icon');

        if (avatarUrl) {
            if (headerAvatar) {
                headerAvatar.src = avatarUrl;
                headerAvatar.classList.remove('hidden');
            }
            if (headerIcon) headerIcon.classList.add('hidden');
            if (this.removeAvatarBtn) this.removeAvatarBtn.classList.remove('hidden');
        } else {
            if (headerAvatar) headerAvatar.classList.add('hidden');
            if (headerIcon) headerIcon.classList.remove('hidden');
            if (this.removeAvatarBtn) this.removeAvatarBtn.classList.add('hidden');
        }
    }

    openModal() {
        if (this.modal) {
            this.modal.classList.remove('hidden');
            this.currentPassword.value = '';
            this.newPassword.value = '';
            this.confirmPassword.value = '';
        }
    }

    closeModal() {
        if (this.modal) this.modal.classList.add('hidden');
    }

    switchTab(tabName) {
        this.tabBtns.forEach(btn => {
            if (btn.dataset.tab === tabName) btn.classList.add('active');
            else btn.classList.remove('active');
        });

        this.tabContents.forEach(content => {
            if (content.id === `settings-tab-${tabName}`) content.classList.remove('hidden');
            else content.classList.add('hidden');
        });
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.avatarPreview.src = e.target.result;
                this.uploadBtn.disabled = false;
            };
            reader.readAsDataURL(file);
        }
    }

    async uploadAvatar() {
        const file = this.avatarInput.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('avatar', file);

        this.uploadBtn.textContent = 'Uploading...';
        this.uploadBtn.disabled = true;

        try {
            const response = await fetch('/auth/upload-avatar', {
                method: 'POST',
                body: formData
            });

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
            const response = await fetch('/auth/remove-avatar', {
                method: 'POST'
            });

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

    async changePassword() {
        const current = this.currentPassword.value;
        const newPass = this.newPassword.value;
        const confirm = this.confirmPassword.value;

        if (!current || !newPass || !confirm) {
            alert('Please fill in all fields.');
            return;
        }

        if (newPass !== confirm) {
            alert('New passwords do not match.');
            return;
        }

        this.savePasswordBtn.textContent = 'Saving...';
        this.savePasswordBtn.disabled = true;

        try {
            const response = await fetch('/auth/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    currentPassword: current,
                    newPassword: newPass
                })
            });

            const data = await response.json();

            if (response.ok) {
                alert('Password changed successfully!');
                this.currentPassword.value = '';
                this.newPassword.value = '';
                this.confirmPassword.value = '';
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
