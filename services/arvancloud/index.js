import {
    ARVANCLOUD_API_KEY,
    ARVANCLOUD_CHATGPT_URL,
    ARVANCLOUD_DEEPSEEK_URL,
    SYSTEM_INSTRUCTION_TEXT
} from '../../config/index.js';

if (!ARVANCLOUD_API_KEY) console.warn('ARVANCLOUD_API_KEY is not set.');

export default async function callArvanCloudAPI(message, conversationHistory = [], model, fileData = null) {
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
        // fileData can be a Data URL string or an object { mimeType, data }
        let mimeType = '';
        let base64Data = '';
        let fileUrl = '';

        if (typeof fileData === 'string' && fileData.startsWith('data:')) {
            const matches = fileData.match(/^data:(.+);base64,(.+)$/);
            if (matches) {
                mimeType = matches[1];
                base64Data = matches[2];
                fileUrl = fileData;
            }
        } else if (fileData && fileData.mimeType && fileData.data) {
             mimeType = fileData.mimeType;
             base64Data = fileData.data;
             fileUrl = `data:${mimeType};base64,${base64Data}`;
        }

        if (mimeType.startsWith('image/')) {
            lastMessageContent = [
                {type: "text", text: message},
                {type: "image_url", image_url: {url: fileUrl}}
            ];
        } else if (mimeType.startsWith('audio/')) {
             // For GPT-4o-mini (and similar OpenAI-compatible endpoints), raw audio input via 'input_audio'
             // is the standard for multimodal audio.
             lastMessageContent = [
                 {type: "text", text: message},
                 {
                     type: "input_audio",
                     input_audio: {
                         data: base64Data,
                         format: mimeType.split('/')[1] // e.g., 'mp3', 'wav'
                     }
                 }
             ];
        }
    }

    const messages = [
        {role: 'system', content: SYSTEM_INSTRUCTION_TEXT},
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
            throw new Error(`ArvanCloud API Error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        const content = data?.choices?.[0]?.message?.content;

        if (!content) throw new Error('No content returned from ArvanCloud API');

        return content;
    } catch (error) {
        console.error('ArvanCloud API call failed:', error);
        throw error;
    }
}
