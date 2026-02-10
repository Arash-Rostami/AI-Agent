import Groq from 'groq-sdk';
import {GROQ_API_KEY, SYSTEM_INSTRUCTION_TEXT} from '../../config/index.js';

if (!GROQ_API_KEY) console.warn('GROQ_API_KEY is not set. Set it in .env or your environment.');

const groq = GROQ_API_KEY ? new Groq({apiKey: GROQ_API_KEY}) : null;

export async function getGroqChatCompletion() {
    if (!groq) throw new Error('Groq client is not initialized. Please check your GROQ_API_KEY.');
    return groq.chat.completions.create({
        messages: [{role: 'system', content: SYSTEM_INSTRUCTION_TEXT}],
        model: 'qwen/qwen3-32b'
    });
}

export default async function callGroqAPI(message, conversationHistory = [], customSystemInstruction = null) {
    if (!groq) throw new Error('Groq client is not initialized. Please check your GROQ_API_KEY.');

    if (!message || typeof message !== 'string') {
        throw new Error('Message must be a non-empty string');
    }

    const messages = [
        {role: 'system', content: customSystemInstruction || SYSTEM_INSTRUCTION_TEXT},
        ...conversationHistory.map(m => ({
            role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content
        })), {role: 'user', content: message}
    ];

    const completion = await groq.chat.completions.create({
        messages, model: 'qwen/qwen3-32b',
    });

    const content = completion?.choices?.[0]?.message?.content;
    if (!content) {
        console.error('Groq raw completion:', completion);
        throw new Error('No content returned from Groq');
    }
    return content;
}
