import fs from 'fs';
import path from 'path';
import Vector from '../models/Vector.js';
import {getEmbeddings} from '../services/arvancloud/embeddings.js';
import {ragDirectory} from '../config/index.js';


let vectorCache = [];

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

export async function initializeVectors() {
    try {
        const stored = await Vector.find({});
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

function chunkText(text, maxChars = 2000) {
    const chunks = [];
    for (let i = 0; i < text.length; i += maxChars) {
        chunks.push(text.substring(i, i + maxChars));
    }
    return chunks;
}

export async function syncDocuments() {
    await Vector.deleteMany({});
    vectorCache = [];
    console.log('🗑️ Cleared existing vector.');

    if (!fs.existsSync(ragDirectory)) throw new Error('Documents directory not found.');

    const files = fs.readdirSync(ragDirectory).filter(f => f.endsWith('.txt') || f.endsWith('.md'));
    let totalChunks = 0;

    for (const file of files) {
        const filePath = path.join(ragDirectory, file);
        const content = fs.readFileSync(filePath, 'utf-8');

        const chunks = chunkText(content);

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            try {
                const vector = await getEmbeddings(chunk);

                const doc = await Vector.create({
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
    return {filesProcessed: files.length, totalChunks};
}

export async function searchVectors(query, topK = 3, filterFileName = null) {
    if (!query) return [];
    if (vectorCache.length === 0) {
        console.warn('⚠️ Vector cache is empty during search.');
        return [];
    }

    try {
        const queryVector = await getEmbeddings(query);

        if (vectorCache.length > 0) {
            const dimQuery = queryVector.length;
            const dimCache = vectorCache[0].vector.length;
            if (dimQuery !== dimCache) console.warn(`⚠️ DIMENSION MISMATCH: Query vector length (${dimQuery}) does not match cached vector length (${dimCache}). Similarity will be 0.`);
        }

        const scored = vectorCache
            .filter(item => !filterFileName || item.fileName === filterFileName)
            .map(item => ({
                ...item, score: cosineSimilarity(queryVector, item.vector)
            }));
        scored.sort((a, b) => b.score - a.score);
        const topResults = scored.slice(0, topK);

        if (topResults.length > 0) {
            console.log(`📊 Top Scores for "${query.substring(0, 20)}...":`, topResults.map(r => r.score.toFixed(4)).join(', '));
        }

        return topResults.filter(item => item.score > 0.15);
    } catch (error) {
        console.error('❌ Vector search error:', error);
        return [];
    }
}
