import ModalHandler from './ModalHandler.js';
export default class AudioHandler {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.stream = null;
    }

    async startRecording() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({audio: true});
            this.mediaRecorder = new MediaRecorder(this.stream);
            this.audioChunks = [];

            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) this.audioChunks.push(event.data);
            };

            this.mediaRecorder.start();
            this.isRecording = true;
            return true;
        } catch (error) {
            console.error('Error accessing microphone:', error);
            await ModalHandler.alert('Could not access microphone. Please check permissions.');
            this.cleanup();
            return false;
        }
    }

    stopRecording() {
        if (!this.mediaRecorder) return Promise.resolve(null);

        return new Promise((resolve) => {
            this.mediaRecorder.onstop = () => {
                const audioBlob = new Blob(this.audioChunks, {type: this.mediaRecorder.mimeType || 'audio/webm'});
                this.cleanup();
                resolve(audioBlob);
            };

            this.mediaRecorder.stop();
            this.isRecording = false;
        });
    }

    cleanup() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
    }

    cancelRecording() {
        if (this.isRecording) this.mediaRecorder.stop();
        this.cleanup();
    }
}
