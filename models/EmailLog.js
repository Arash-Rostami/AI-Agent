import mongoose from 'mongoose';

const emailLogSchema = new mongoose.Schema({
    userId: {
        type: String,
        index: true,
        default: null
    },
    recipient: {
        type: String,
        required: true
    },
    subject: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'success', 'failed'],
        default: 'pending'
    },
    provider: {
        type: String,
        default: 'brevo'
    },
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    error: {
        type: String,
        default: null
    }
}, {timestamps: true});

emailLogSchema.index({userId: 1, createdAt: -1});

const EmailLog = mongoose.model('EmailLog', emailLogSchema);

export default EmailLog;
