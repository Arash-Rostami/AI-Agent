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

interactionSchema.index({userId: 1, sessionId: 1});

const InteractionLog = mongoose.model('InteractionLog', interactionSchema);

export default InteractionLog;
