import axios from 'axios';
import { BMS_API_URL, AI_SERVICE_SECRET } from '../config/index.js';

/**
 * Searches the BMS database.
 * @param {string} query - The search keyword.
 * @param {string} [entity_type] - The specific entity to search for (optional).
 * @returns {Promise<Object>} - The search results.
 */
export async function searchBmsDatabase(query, entity_type) {
    if (!AI_SERVICE_SECRET) {
        throw new Error("AI_SERVICE_SECRET is not configured.");
    }

    try {
        const payload = { query };
        if (entity_type) {
            payload.entity_type = entity_type;
        }

        const response = await axios.post(BMS_API_URL, payload, {
            headers: {
                'Content-Type': 'application/json',
                'X-AI-SECRET': AI_SERVICE_SECRET
            },
            timeout: 15000 // 15 seconds timeout
        });

        return response.data;
    } catch (error) {
        console.error("BMS Database Search Error:", error.message);
        if (error.response) {
            // Return the error from the backend if available
            return { error: error.response.data?.message || "Error from BMS Service" };
        }
        return { error: "Failed to connect to BMS Service." };
    }
}
