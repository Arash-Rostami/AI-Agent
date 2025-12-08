import axios from 'axios';
import {OPENROUTER_API_KEY, OPENROUTER_API_URL, SITE_NAME, SITE_URL, SYSTEM_INSTRUCTION_TEXT} from '../../config/index.js';


export default async function callOpenRouterAPI(message, conversationHistory = []) {
    if (!OPENROUTER_API_KEY) throw new Error("OPEN_ROUTER_API_KEY is missing");

    try {
        const formattedHistory = conversationHistory.map(msg => ({
            role: msg.role === 'assistant' ? 'assistant' : 'user',
            content: msg.content
        }));

        const messages = [
            {role: 'system', content: SYSTEM_INSTRUCTION_TEXT},
            ...formattedHistory,
            {role: 'user', content: message}
        ];

        const response = await axios.post(
            OPENROUTER_API_URL,
            {
                model: 'x-ai/grok-4.1-fast',
                messages: messages
            },
            {
                headers: {
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                    'HTTP-Referer': SITE_URL,
                    'X-Title': SITE_NAME,
                    'Content-Type': 'application/json'
                },
                timeout: 60000
            }
        );

        const content = response.data.choices?.[0]?.message?.content;
        if (!content) throw new Error('No content received from OpenRouter');

        return content;

    } catch (error) {
        console.error('❌ OpenRouter API Error:', error.response?.data || error.message);
        throw error;
    }
}