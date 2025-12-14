import mongoose from 'mongoose';

const VectorStoreSchema = new mongoose.Schema({
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

// Index for faster standard queries if needed, though we use in-memory search
VectorStoreSchema.index({ fileName: 1 });

const VectorStore = mongoose.model('VectorStore', VectorStoreSchema);

export default VectorStore;
