import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import Vector from '../models/Vector.js';
import {getEmbeddings} from '../services/arvancloud/embeddings.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    const docsDir = path.resolve(__dirname, '../documents');

    await Vector.deleteMany({});
    vectorCache = [];
    console.log('🗑️ Cleared existing vector.');

    if (!fs.existsSync(docsDir)) throw new Error('Documents directory not found.');

    const files = fs.readdirSync(docsDir).filter(f => f.endsWith('.txt') || f.endsWith('.md'));
    let totalChunks = 0;

    for (const file of files) {
        const filePath = path.join(docsDir, file);
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

export async function searchVectors(query, topK = 3) {
    if (!query || vectorCache.length === 0) return [];

    try {
        const queryVector = await getEmbeddings(query);

        const scored = vectorCache.map(item => ({
            ...item,
            score: cosineSimilarity(queryVector, item.vector)
        }));

        scored.sort((a, b) => b.score - a.score);

        // DEBUG LOGGING
        console.log(`🔍 Vector Search Debug: Top 3 scores for query "${query.substring(0, 20)}..."`);
        scored.slice(0, 3).forEach((item, idx) => {
            console.log(`   ${idx + 1}. Score: ${item.score.toFixed(4)} | File: ${item.fileName}`);
        });

        return scored.slice(0, topK).filter(item => item.score > 0.3);
    } catch (error) {
        console.error('Vector search error:', error);
        return [];
    }
}

function loadFallbackContent() {
    console.warn('⚠️ Vector search yielded no results or failed. Switching to file-based fallback.');
    // Correct ESM path resolution:
    // __dirname is already defined at the top of the file as path.dirname(fileURLToPath(import.meta.url))
    // So we can use it safely here.
    const instructionsPath = path.resolve(__dirname, '../documents/instructions.txt');
    const cxBmsPath = path.resolve(__dirname, '../documents/cxbms.txt');

    let fallbackContext = "";

    try {
        if (fs.existsSync(instructionsPath)) {
            fallbackContext += fs.readFileSync(instructionsPath, 'utf-8') + "\n\n";
        }
        if (fs.existsSync(cxBmsPath)) {
            fallbackContext += fs.readFileSync(cxBmsPath, 'utf-8');
        }
    } catch (err) {
        console.error('Critical: Failed to read fallback files:', err);
    }

    return fallbackContext;
}

export const enrichPromptWithContext = async (message) => {
    try {
        const results = await searchVectors(message);

        // If results are found, use them
        if (results && results.length > 0) {
            const context = results.map(r => r.text).join('\n\n---\n\n');
            return `Context information is below.\n---------------------\n${context}\n---------------------\nGiven the context information and not prior knowledge, answer the query.\nQuery: ${message}`;
        }

        // Fallback Trigger: Empty results
        const fallbackContext = loadFallbackContent();
        if (fallbackContext.trim()) {
             return `Context information is below.\n---------------------\n${fallbackContext}\n---------------------\nGiven the context information and not prior knowledge, answer the query.\nQuery: ${message}`;
        }

        return message;

    } catch (error) {
        console.error('Context enrichment failed (Main Block):', error);

        // Fallback Trigger: Exception in search
        try {
            const fallbackContext = loadFallbackContent();
            if (fallbackContext.trim()) {
                 return `Context information is below.\n---------------------\n${fallbackContext}\n---------------------\nGiven the context information and not prior knowledge, answer the query.\nQuery: ${message}`;
            }
        } catch(fallbackError) {
             console.error('Critical: Fallback also failed in catch block:', fallbackError);
        }

        return message;
    }
};
