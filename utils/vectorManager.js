import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import Vector from '../models/Vector.js';
import {getEmbeddings} from '../services/arvancloud/embeddings.js';
// import {CX_BMS_INSTRUCTION_FALLBACK, SYSTEM_INSTRUCTION_TEXT_FALLBACK} from "../config/index.js";

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
    if (!query) return [];
    if (vectorCache.length === 0) {
        console.warn('⚠️ Vector cache is empty during search.');
        return [];
    }

    try {
        console.log(`🔍 Searching vectors for query: "${query.substring(0, 50)}..."`);
        const queryVector = await getEmbeddings(query);

        const scored = vectorCache.map(item => ({
            ...item,
            score: cosineSimilarity(queryVector, item.vector)
        }));

        scored.sort((a, b) => b.score - a.score);

        const topResults = scored.slice(0, topK);
        console.log('📊 Top 3 Similarity Scores:', topResults.map(r => r.score.toFixed(4)));

        return topResults.filter(item => item.score > 0.3);
    } catch (error) {
        console.error('❌ Vector search error:', error);
        return [];
    }
}


export const enrichPromptWithContext = async (message) => {
    try {
        const results = await searchVectors(message);

        if (results && results.length > 0) {
            const context = results.map(r => r.text).join('\n\n---\n\n');
            return `Context information is below.\n---------------------\n${context}\n---------------------\nGiven the context information and not prior knowledge, answer the query.\nQuery: ${message}`;
        }

        // FALLBACK: If no results (or empty), load text files directly
        console.warn('⚠️ Vector search yield no results. Switching to file-based fallback.');
        let fallbackContext = "";
        fallbackContext += SYSTEM_INSTRUCTION_TEXT + "\n\n";
        fallbackContext += CX_BMS_INSTRUCTION;

        if (fallbackContext.trim()) {
            return `Context information is below.\n---------------------\n${fallbackContext}\n---------------------\nGiven the context information and not prior knowledge, answer the query.\nQuery: ${message}`;
        }

        return message;

    } catch (error) {
        console.error('Context enrichment failed:', error);
        try {
            console.warn('⚠️ Vector search error. Switching to file-based fallback.');
            let fallbackContext = "";
            fallbackContext += SYSTEM_INSTRUCTION_TEXT + "\n\n";
            fallbackContext += CX_BMS_INSTRUCTION;

            if (fallbackContext.trim()) {
                return `Context information is below.\n---------------------\n${fallbackContext}\n---------------------\nGiven the context information and not prior knowledge, answer the query.\nQuery: ${message}`;
            }
        } catch (fallbackError) {
            console.error('Critical: Fallback also failed:', fallbackError);
        }

        return message;
    }
}