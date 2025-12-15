import axios from 'axios';
import {ARVANCLOUD_API_KEY, ARVANCLOUD_EMBEDDING_URL} from '../../config/index.js';

export async function getEmbeddings(text) {
    if (!text || typeof text !== 'string') throw new Error('Input text must be a non-empty string');
    
    try {
        const response = await axios.post(
            ARVANCLOUD_EMBEDDING_URL,
            {
                input: text.replace(/\n/g, ' '),  // Sanitized to avoid issues with newlines
                model: 'Embedding-3-Large-nxekt'
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
