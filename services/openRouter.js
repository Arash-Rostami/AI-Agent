import axios from 'axios';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {OPENROUTER_API_KEY, OPENROUTER_API_URL, SITE_NAME, SITE_URL} from '../config/index.js';
import {allToolDefinitions, availableTools} from "../tools/toolDefinitions.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const instructionPath = path.resolve(__dirname, '..', 'documents', 'instructions.txt');
const SYSTEM_INSTRUCTION_TEXT = fs.readFileSync(instructionPath, 'utf-8');

// Convert Gemini-style tool definitions to OpenAI-style
const TOOL_DEFINITIONS = allToolDefinitions.map(tool => ({
    type: "function",
    function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
    }
}));

const EXECUTING_TOOLS = availableTools;

export default async function callOpenRouterAPI(message, conversationHistory = []) {
    if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is missing");

    // Construct the initial message chain
    let messages = [
        {role: 'system', content: SYSTEM_INSTRUCTION_TEXT},
        ...conversationHistory.map(msg => {
            // Filter or map existing history. Skipping tool logs for simplicity if not in proper format.
            if (msg.role === 'tool_request' || msg.role === 'tool_response') return null;
            return {
                role: msg.role === 'assistant' ? 'assistant' : 'user',
                content: msg.content
            };
        }).filter(Boolean),
        {role: 'user', content: message}
    ];

    return await _executeOpenRouterLoop(messages);
}

async function _executeOpenRouterLoop(messages) {
    try {
        const response = await axios.post(
            OPENROUTER_API_URL || 'https://openrouter.ai/api/v1/chat/completions',
            {
                model: 'meta-llama/llama-3.1-70b-instruct', // Specific model known for good tool use support
                messages: messages,
                tools: TOOL_DEFINITIONS,
                tool_choice: "auto"
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

        const choice = response.data.choices?.[0];
        const responseMessage = choice?.message;

        if (!responseMessage) throw new Error('No content received from OpenRouter');

        // Check if the model wants to call a tool
        if (responseMessage.tool_calls) {
            console.log("🤖 OpenRouter requested tool execution:", responseMessage.tool_calls.length);

            // Add the assistant's request to the conversation history
            messages.push(responseMessage);

            for (const toolCall of responseMessage.tool_calls) {
                const functionName = toolCall.function.name;
                const functionArgs = JSON.parse(toolCall.function.arguments);

                console.log(`🔨 Executing tool (OpenRouter): ${functionName}`, functionArgs);

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

            // Recursive call with updated history
            return await _executeOpenRouterLoop(messages);
        }

        return responseMessage.content;

    } catch (error) {
        console.error('❌ OpenRouter API Error:', error.response?.data || error.message);
        throw error;
    }
}
