import mongoose from 'mongoose';

const interactionSchema = new mongoose.Schema({
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
}, {timestamps: true});

// Index 1: Fast lookup for specific sessions (e.g. clicking a chat)
interactionSchema.index({userId: 1, sessionId: 1});

// Index 2: Fast lookup for the History List (Infinite Scroll)
// This makes "sort by createdAt" instant for old and new data.
interactionSchema.index({userId: 1, createdAt: -1});

const InteractionLog = mongoose.model('InteractionLog', interactionSchema);

export default InteractionLog;
