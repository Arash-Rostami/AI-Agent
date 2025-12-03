import Groq from 'groq-sdk';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {GROK_API_KEY} from '../config/index.js';
import {allToolDefinitions, availableTools} from "../tools/toolDefinitions.js";

if (!GROK_API_KEY) console.warn('GROK_API_KEY is not set. Set it in .env or your environment.');

const groq = new Groq({apiKey: GROK_API_KEY});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const instructionPath = path.resolve(__dirname, '..', 'documents', 'instructions.txt');
const SYSTEM_INSTRUCTION_TEXT = fs.readFileSync(instructionPath, 'utf-8');

// Convert Gemini-style tool definitions to OpenAI-style (which Groq uses)
const TOOL_DEFINITIONS = allToolDefinitions.map(tool => ({
    type: "function",
    function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
    }
}));

const EXECUTING_TOOLS = availableTools;

export async function getGroqChatCompletion() {
    return groq.chat.completions.create({
        messages: [{role: 'system', content: SYSTEM_INSTRUCTION_TEXT}],
        model: 'openai/gpt-oss-120b'
    });
}

export default async function callGrokAPI(message, conversationHistory = []) {
    if (!message || typeof message !== 'string') {
        throw new Error('Message must be a non-empty string');
    }

    // Format history: filter out internal tool messages if they don't match OpenAI format,
    // or adapt them. For now, we'll reconstruct the message chain including system instructions.
    let messages = [
        {role: 'system', content: SYSTEM_INSTRUCTION_TEXT},
        ...conversationHistory.map(m => {
            // Basic mapping; for robust tool use, we'd need to persist the tool_calls/tool_response structure
            // in conversationHistory properly. Assuming simple text history for now.
             if (m.role === 'tool_request' || m.role === 'tool_response') {
                 // Skip internal tool logs for now to avoid format errors, or map them if needed
                 return null;
             }
            return {
                role: m.role === 'assistant' ? 'assistant' : 'user',
                content: m.content
            };
        }).filter(Boolean),
        {role: 'user', content: message}
    ];

    return await _executeGrokLoop(messages);
}

async function _executeGrokLoop(messages) {
    try {
        const completion = await groq.chat.completions.create({
            messages,
            model: 'llama3-70b-8192', // 'openai/gpt-oss-120b' might not support tools reliably; Llama 3 on Groq does.
            tools: TOOL_DEFINITIONS,
            tool_choice: "auto"
        });

        const responseMessage = completion.choices[0].message;

        // Check if the model wants to call a tool
        if (responseMessage.tool_calls) {
            console.log("🤖 Groq requested tool execution:", responseMessage.tool_calls.length);

            // Add the assistant's request to the conversation history
            messages.push(responseMessage);

            for (const toolCall of responseMessage.tool_calls) {
                const functionName = toolCall.function.name;
                const functionArgs = JSON.parse(toolCall.function.arguments);

                console.log(`🔨 Executing tool: ${functionName}`, functionArgs);

                if (EXECUTING_TOOLS[functionName]) {
                    const toolResult = await EXECUTING_TOOLS[functionName](...Object.values(functionArgs));

                    // Add the tool result to the messages
                    messages.push({
                        tool_call_id: toolCall.id,
                        role: "tool",
                        name: functionName,
                        content: JSON.stringify(toolResult)
                    });
                } else {
                    console.error(`❌ Tool ${functionName} not found.`);
                    messages.push({
                        tool_call_id: toolCall.id,
                        role: "tool",
                        name: functionName,
                        content: "Error: Tool not found"
                    });
                }
            }

            // Recursive call with updated history (assistant request + tool results)
            return await _executeGrokLoop(messages);
        }

        // If no tool call, return the text content
        return responseMessage.content;

    } catch (error) {
        console.error('❌ Groq API Error:', error);
        throw new Error('Failed to get response from Groq');
    }
}
