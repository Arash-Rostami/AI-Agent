import axios from 'axios';
import { ARVANCLOUD_API_KEY } from '../../config/index.js';

const EMBEDDING_URL = 'https://arvancloudai.ir/gateway/models/Embedding-3-Large/_46PfhWjuDK4JjXl31gyVB26N1UHw2zPOR1Oj_tFlypDN0dnWQQ4WgjV06yfiFcnwo1uyn_UT3FlzOMnqH1PWEMZHbrfpow8o1Jo4IAWlTuLr8PnaB9w-kVScsuX9vOYcQ-v7trIgkeBIKC2y1bYorNXRbIM2Cau4iJAosjqsNb46gBAbkrD9aJIxhxUevWwiOqK_eE5biRpZ8H_l8Mrwmp_rSxMEHT0mYKD-VuNyvC2xRLtTVBfNi9MINP6oXRXsTE1gY0d000/v1/embeddings';
const MODEL_NAME = 'Embedding-3-Large-nxekt';

export async function getEmbeddings(text) {
    if (!text || typeof text !== 'string') {
        throw new Error('Input text must be a non-empty string');
    }

    // Sanitize input to avoid issues with newlines in some APIs
    const sanitizedText = text.replace(/\n/g, ' ');

    try {
        const response = await axios.post(
            EMBEDDING_URL,
            {
                input: sanitizedText,
                model: MODEL_NAME
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${ARVANCLOUD_API_KEY}`
                }
            }
        );

        if (response.data && response.data.data && response.data.data[0] && response.data.data[0].embedding) {
            return response.data.data[0].embedding;
        } else {
            console.error('Unexpected ArvanCloud Embedding response structure:', JSON.stringify(response.data));
            throw new Error('Invalid response structure from ArvanCloud Embedding API');
        }

    } catch (error) {
        console.error('ArvanCloud Embedding API Error:', error.message);
        if (error.response) {
            console.error('Response Status:', error.response.status);
            console.error('Response Data:', JSON.stringify(error.response.data));
        }
        throw error;
    }
}
