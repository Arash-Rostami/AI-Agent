import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true
    },
    sessionId: {
        type: String,
        required: true,
        index: true
    },
    messages: [
        {
            role: {
                type: String,
                enum: ['user', 'model', 'system'],
                required: true
            },
            parts: [
                {
                    text: String
                }
            ],
            timestamp: {
                type: Date,
                default: Date.now
            }
        }
    ]
}, { timestamps: true });

// Create a compound index for efficient querying of a specific session for a user
conversationSchema.index({ userId: 1, sessionId: 1 });

const Conversation = mongoose.model('Conversation', conversationSchema);

export default Conversation;
