import {
    ARVANCLOUD_API_KEY,
    ARVANCLOUD_CHATGPT_URL,
    ARVANCLOUD_DEEPSEEK_URL,
    SYSTEM_INSTRUCTION_TEXT
} from '../../config/index.js';

export default async function callArvanCloudAPI(message, conversationHistory = [], model, fileData = null, customSystemInstruction = null) {
    if (!ARVANCLOUD_API_KEY) {
        console.log('[CRITICAL ERROR] ARVANCLOUD_API_KEY is not set.');
        throw new Error('ARVANCLOUD_API_KEY is not set.');
    }

    if (!message || typeof message !== 'string') throw new Error('Message must be a non-empty string');

    const MODELS = {
        'GPT-4o-mini-4193n': {url: ARVANCLOUD_CHATGPT_URL, id: 'GPT-4o-mini-4193n'},
        'DeepSeek-Chat-V3-0324-mbxyd': {url: ARVANCLOUD_DEEPSEEK_URL, id: 'DeepSeek-Chat-V3-0324-mbxyd'},
    };

    let {
        url: endpointUrl, id: modelId
    } = MODELS[model] ?? (() => {
        throw new Error('Invalid model selected for ArvanCloud!')
    })();

    if (!endpointUrl) throw new Error(`Endpoint URL for model ${model} is not configured.`);

    let lastMessageContent = message;
    if (fileData && (modelId.toLowerCase().includes('gpt') || modelId.toLowerCase().includes('4o'))) {
        lastMessageContent = [
            {type: "text", text: message},
            {type: "image_url", image_url: {url: fileData}}
        ];
    }

    const messages = [
        {role: 'system', content: customSystemInstruction || SYSTEM_INSTRUCTION_TEXT},
        ...conversationHistory.map(m => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content
        })),
        {role: 'user', content: lastMessageContent}
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
            console.log('[CRITICAL ERROR] ArvanCloud Response:', errorText);
            throw new Error(`ArvanCloud API Error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content;

        if (!content) {
            console.log('[ERROR] No content in ArvanCloud response:', JSON.stringify(data));
            throw new Error('No content returned from ArvanCloud API');
        }

        return content;
    } catch (error) {
        console.log('[CRITICAL ERROR] ArvanCloud API call failed:', error.message);
        throw error;
    }
}
