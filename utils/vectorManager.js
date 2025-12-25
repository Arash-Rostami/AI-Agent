import fs from 'fs';
import path from 'path';
import Vector from '../models/Vector.js';
import {getEmbeddings} from '../services/arvancloud/embeddings.js';
import {ragDirectory} from '../config/index.js';
import {Worker} from 'worker_threads';
import {fileURLToPath} from 'url';
import crypto from 'crypto';

// Resolve directory for worker script
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workerPath = path.join(__dirname, 'searchWorker.js');

let searchWorker = null;
const requestMap = new Map();

function getWorker() {
    if (!searchWorker) {
        searchWorker = new Worker(workerPath);
        searchWorker.on('message', (msg) => {
            if (msg.type === 'init_done') {
                console.log(`🧠 Worker loaded ${msg.count} document chunks.`);
            } else if (msg.requestId) {
                const resolver = requestMap.get(msg.requestId);
                if (resolver) {
                    if (msg.error) resolver.reject(new Error(msg.error));
                    else resolver.resolve(msg.results);
                    requestMap.delete(msg.requestId);
                }
            }
        });
        searchWorker.on('error', (err) => {
            console.error('❌ Search Worker Error:', err);
        });
    }
    return searchWorker;
}

export async function initializeVectors() {
    try {
        const stored = await Vector.find({});
        const vectorCache = stored.map(doc => ({
            id: doc._id.toString(), // Convert ObjectId to string for worker safety
            text: doc.text,
            vector: doc.vector,
            fileName: doc.fileName
        }));

        getWorker().postMessage({ type: 'init', data: vectorCache });

    } catch (error) {
        console.error('❌ Failed to initialize vectors:', error);
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

    // Clear worker cache by sending empty init or handle re-init at end
    // We will just re-init at the end

    console.log('🗑️ Cleared existing vector.');

    if (!fs.existsSync(ragDirectory)) throw new Error('Documents directory not found.');

    const files = fs.readdirSync(ragDirectory).filter(f => f.endsWith('.txt') || f.endsWith('.md'));
    let totalChunks = 0;

    // Use a temp local cache to batch send to worker if needed,
    // or just re-read from DB like initializeVectors does.
    // Given the architecture, syncDocuments writes to DB.
    // So we just call initializeVectors() at the end to reload the worker.

    for (const file of files) {
        const filePath = path.join(ragDirectory, file);
        const content = fs.readFileSync(filePath, 'utf-8');

        const chunks = chunkText(content);

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            try {
                const vector = await getEmbeddings(chunk);

                await Vector.create({
                    fileName: file,
                    chunkId: `${file}_${i}`,
                    text: chunk,
                    vector: vector
                });

                process.stdout.write(`✅ Processed ${file} chunk ${i + 1}/${chunks.length}\r`);
            } catch (err) {
                console.error(`\n❌ Error processing ${file} chunk ${i}:`, err.message);
            }
        }
        totalChunks += chunks.length;
    }
    console.log(`\n✨ Sync complete. processed ${files.length} files into ${totalChunks} chunks.`);

    // Reload worker
    await initializeVectors();

    return {filesProcessed: files.length, totalChunks};
}

export async function searchVectors(query, topK = 3, filterFileName = null) {
    if (!query) return [];

    try {
        const queryVector = await getEmbeddings(query);
        const requestId = crypto.randomUUID();

        return new Promise((resolve, reject) => {
            requestMap.set(requestId, { resolve, reject });

            // Timeout to prevent hanging promises
            setTimeout(() => {
                if (requestMap.has(requestId)) {
                    requestMap.delete(requestId);
                    reject(new Error('Vector search timed out'));
                }
            }, 5000);

            getWorker().postMessage({
                type: 'search',
                queryVector,
                topK,
                filterFileName,
                requestId
            });
        });

    } catch (error) {
        console.error('❌ Vector search error:', error);
        return [];
    }
}
