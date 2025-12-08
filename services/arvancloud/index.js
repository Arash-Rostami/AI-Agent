import {
    ARVANCLOUD_API_KEY,
    ARVANCLOUD_CHATGPT_URL,
    ARVANCLOUD_DEEPSEEK_URL,
    SYSTEM_INSTRUCTION_TEXT
} from '../../config/index.js';

if (!ARVANCLOUD_API_KEY) console.warn('ARVANCLOUD_API_KEY is not set.');

export default async function callArvanCloudAPI(message, conversationHistory = [], model) {
    if (!message || typeof message !== 'string') {
        throw new Error('Message must be a non-empty string');
    }

    let endpointUrl;
    let modelId;

    if (model === 'GPT-4o-mini-4193n') {
        endpointUrl = ARVANCLOUD_CHATGPT_URL;
        modelId = 'GPT-4o-mini-4193n';
    } else if (model === 'DeepSeek-Chat-V3-0324-mbxyd') {
        endpointUrl = ARVANCLOUD_DEEPSEEK_URL;
        modelId = 'DeepSeek-Chat-V3-0324-mbxyd';
    } else {
        throw new Error('Invalid model selected for ArvanCloud service');
    }

    if (!endpointUrl) {
        throw new Error(`Endpoint URL for model ${model} is not configured.`);
    }

    const messages = [
        {role: 'system', content: SYSTEM_INSTRUCTION_TEXT},
        ...conversationHistory.map(m => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content
        })),
        {role: 'user', content: message}
    ];

    try {
        const response = await fetch(endpointUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `apikey ${ARVANCLOUD_API_KEY}`
            },
            body: JSON.stringify({
                model: modelId,
                messages: messages,
                max_tokens: 3000,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`ArvanCloud API Error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content;

        if (!content) {
            throw new Error('No content returned from ArvanCloud API');
        }

        return content;
    } catch (error) {
        console.error('ArvanCloud API call failed:', error);
        throw error;
    }
}
