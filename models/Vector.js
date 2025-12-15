import mongoose from 'mongoose';

const VectorSchema = new mongoose.Schema({
    fileName: {
        type: String,
        required: true
    },
    chunkId: {
        type: String,
        required: true
    },
    text: {
        type: String,
        required: true
    },
    vector: {
        type: [Number],
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

VectorSchema.index({fileName: 1});

const Vector = mongoose.model('Vector', VectorSchema);

export default Vector;
