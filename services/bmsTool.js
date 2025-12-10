import axios from 'axios';
import {AI_SERVICE_SECRET, BMS_API_URL} from '../config/index.js';

export async function searchBmsDatabase(query, entity_type) {
    if (!AI_SERVICE_SECRET) throw new Error("AI_SERVICE_SECRET is not configured.");

    try {
        const payload = {query};
        if (entity_type) payload.entity_type = entity_type;

        const response = await axios.post(BMS_API_URL, payload, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'User-Agent': 'Arash-AI-Service/1.0',
                'X-AI-SECRET': AI_SERVICE_SECRET
            },
            timeout: 15000
        });

        return response.data;
    } catch (error) {
        console.error("BMS Database Search Error:", error.message);
        if (error.response) return {error: error.response.data?.message || "Error from BMS Service"};

        return {error: "Failed to connect to BMS Service."};
    }
}
