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
interactionSchema.index({userId: 1, createdAt: -1});

interactionSchema.statics.fetchHistoryPreviews = function (userId, cursor, limit) {
    const matchStage = {userId, 'messages.role': 'user'};

    if (cursor) matchStage.createdAt = {$lt: new Date(cursor)};

    return this.aggregate([
        {$match: matchStage},
        {$sort: {createdAt: -1}},
        {$limit: limit},
        {
            $project: {
                sessionId: 1,
                createdAt: 1,
                firstUserMsg: {
                    $arrayElemAt: [
                        {$filter: {input: '$messages', as: 'msg', cond: {$eq: ['$$msg.role', 'user']}}},
                        0
                    ]
                }
            }
        },
        {
            $project: {
                sessionId: 1,
                createdAt: 1,
                preview: {
                    $substrCP: [{$arrayElemAt: ['$firstUserMsg.parts.text', 0]}, 0, 50]
                }
            }
        }
    ]);
};

const InteractionLog = mongoose.model('InteractionLog', interactionSchema);

export default InteractionLog;