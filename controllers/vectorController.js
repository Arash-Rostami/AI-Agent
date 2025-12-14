import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import VectorStore from '../models/VectorStore.js';
import { getEmbeddings } from '../services/arvancloud/embeddings.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory cache for vectors: array of { id, text, vector, fileName }
let vectorCache = [];

// Helper: Cosine Similarity
function cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Load vectors from DB to memory
export async function initializeVectors() {
    try {
        const stored = await VectorStore.find({});
        vectorCache = stored.map(doc => ({
            id: doc._id,
            text: doc.text,
            vector: doc.vector,
            fileName: doc.fileName
        }));
        console.log(`🧠 Loaded ${vectorCache.length} document chunks into memory.`);
    } catch (error) {
        console.error('❌ Failed to initialize vector cache:', error);
    }
}

// Chunking Logic (Simple character based for now, can be improved)
function chunkText(text, maxChars = 2000) {
    const chunks = [];
    for (let i = 0; i < text.length; i += maxChars) {
        chunks.push(text.substring(i, i + maxChars));
    }
    return chunks;
}

// Sync Process: Delete all, read files, embed, save
export async function syncDocuments() {
    const docsDir = path.resolve(__dirname, '../documents');

    // 1. Clear existing
    await VectorStore.deleteMany({});
    vectorCache = [];
    console.log('🗑️ Cleared existing vector store.');

    // 2. Read files
    if (!fs.existsSync(docsDir)) {
        throw new Error('Documents directory not found.');
    }

    const files = fs.readdirSync(docsDir).filter(f => f.endsWith('.txt') || f.endsWith('.md'));
    let totalChunks = 0;

    for (const file of files) {
        const filePath = path.join(docsDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');

        // 3. Chunk
        const chunks = chunkText(content);

        // 4. Embed & Save
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            try {
                // Rate limit handling could be added here if needed (e.g., sleep)
                const vector = await getEmbeddings(chunk);

                const doc = await VectorStore.create({
                    fileName: file,
                    chunkId: `${file}_${i}`,
                    text: chunk,
                    vector: vector
                });

                vectorCache.push({
                    id: doc._id,
                    text: doc.text,
                    vector: doc.vector,
                    fileName: doc.fileName
                });

                process.stdout.write(`✅ Processed ${file} chunk ${i + 1}/${chunks.length}\r`);
            } catch (err) {
                console.error(`\n❌ Error processing ${file} chunk ${i}:`, err.message);
            }
        }
        totalChunks += chunks.length;
    }
    console.log(`\n✨ Sync complete. processed ${files.length} files into ${totalChunks} chunks.`);
    return { filesProcessed: files.length, totalChunks };
}

// Search Function
export async function searchVectors(query, topK = 3) {
    if (!query || vectorCache.length === 0) return [];

    try {
        const queryVector = await getEmbeddings(query);

        const scored = vectorCache.map(item => ({
            ...item,
            score: cosineSimilarity(queryVector, item.vector)
        }));

        // Sort descending by score
        scored.sort((a, b) => b.score - a.score);

        // Return top K with a threshold (e.g., 0.3 to filter noise)
        return scored.slice(0, topK).filter(item => item.score > 0.3);
    } catch (error) {
        console.error('Vector search error:', error);
        return [];
    }
}
