import Groq from 'groq-sdk';
import {GROK_API_KEY} from '../config/index.js';

if (!GROK_API_KEY) {
    console.warn('GROK_API_KEY is not set. Set it in .env or your environment.');
}

const groq = new Groq({apiKey: GROK_API_KEY});


export async function getGroqChatCompletion() {
    return groq.chat.completions.create({
        messages: [{role: 'user', content: 'Explain the importance of fast language models'}],
        model: 'openai/gpt-oss-120b'
    });
}


export default async function callGrokAPI(message, conversationHistory = []) {
    if (!message || typeof message !== 'string') {
        throw new Error('Message must be a non-empty string');
    }

    const messages = [...conversationHistory.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content
    })), {role: 'user', content: message}];

    const completion = await groq.chat.completions.create({
        messages, model: 'openai/gpt-oss-120b',
    });

    const content = completion?.choices?.[0]?.message?.content;
    if (!content) {
        console.error('Grok raw completion:', completion);
        throw new Error('No content returned from Grok');
    }
    return content;
}
