import { parentPort } from 'worker_threads';

let vectorCache = [];

function calculateMagnitude(vec) {
    let sum = 0;
    for (let i = 0; i < vec.length; i++) {
        sum += vec[i] * vec[i];
    }
    return Math.sqrt(sum);
}

parentPort.on('message', (msg) => {
    try {
        if (msg.type === 'init') {
            // Msg.data is the array of docs from DB
            // Pre-calculate magnitudes for faster search
            vectorCache = msg.data.map(item => ({
                id: item.id,
                text: item.text,
                vector: item.vector,
                fileName: item.fileName,
                magnitude: calculateMagnitude(item.vector)
            }));
            parentPort.postMessage({ type: 'init_done', count: vectorCache.length });
        } else if (msg.type === 'search') {
            const { queryVector, topK, filterFileName, requestId } = msg;

            if (vectorCache.length === 0) {
                parentPort.postMessage({ requestId, results: [] });
                return;
            }

            const queryMag = calculateMagnitude(queryVector);
            if (queryMag === 0) {
                 parentPort.postMessage({ requestId, results: [] });
                 return;
            }

            const scored = [];

            // Check dimensions of first item to warn/abort if mismatch?
            // The original code logged a warning. We can skip mismatching vectors.
            const dimQuery = queryVector.length;

            for (let i = 0; i < vectorCache.length; i++) {
                const item = vectorCache[i];
                if (filterFileName && item.fileName !== filterFileName) continue;

                if (item.vector.length !== dimQuery) continue;

                let dotProduct = 0;
                const vec = item.vector;
                // Standard loop is V8 optimized
                for (let j = 0; j < dimQuery; j++) {
                    dotProduct += vec[j] * queryVector[j];
                }

                const similarity = dotProduct / (queryMag * item.magnitude);

                if (similarity > 0.15) {
                    // We construct a new object to avoid sending the heavy vector back if not needed,
                    // but the original code returned the whole item. We keep consistency.
                    scored.push({
                        id: item.id,
                        text: item.text,
                        fileName: item.fileName,
                        score: similarity,
                        // Not sending 'vector' back to main thread to save serialization bandwidth
                        // unless strict requirement. Original returned it.
                        // Let's omit it for performance (minimal change, big win).
                        // If logic depends on it, we might break something.
                        // Checking vectorManager.js usages... searchVectors returns it.
                        // But usually UI just needs text.
                        // I will include it to be safe, but it is heavy.
                        vector: item.vector
                    });
                }
            }

            scored.sort((a, b) => b.score - a.score);
            const topResults = scored.slice(0, topK);

            parentPort.postMessage({ requestId, results: topResults });
        }
    } catch (error) {
        parentPort.postMessage({
            requestId: msg.requestId,
            error: error.message
        });
    }
});
