import axios from "axios";
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {GEMINI_API_URL} from "../config/index.js";
import {allToolDefinitions, availableTools} from "../tools/toolDefinitions.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const instructionPath = path.resolve(__dirname, '..', 'documents', 'instructions.txt');
const SYSTEM_INSTRUCTION_TEXT = fs.readFileSync(instructionPath, 'utf-8');

const TOOL_DEFINITIONS = allToolDefinitions;
const EXECUTING_TOOLS = availableTools;


export default async function callGeminiAPI(
    message,
    conversationHistory = [],
    apiKey,
    isRestrictedMode = false,
    useWebSearch = false
) {
    if (!apiKey) throw new Error("API Key is missing in callGeminiAPI");

    try {
        const contents = _formatConversationContents(conversationHistory, message);

        const requestBody = {
            contents,
            tools: isRestrictedMode
                ? undefined
                : ((!useWebSearch) ? TOOL_DEFINITIONS.filter(t => t.name !== 'getWebSearch') : TOOL_DEFINITIONS),
            tool_config: isRestrictedMode ? undefined : {
                function_calling_config: {
                    mode: "AUTO"
                }
            },
            systemInstruction: {
                parts: [{
                    text: isRestrictedMode
                        ? "You are a helpful AI assistant. Answer the user's questions concisely and politely in their own language."
                        : SYSTEM_INSTRUCTION_TEXT
                }]
            }
        };

        const response = await axios.post(
            `${GEMINI_API_URL}?key=${apiKey}`,
            requestBody,
            {
                headers: {'Content-Type': 'application/json'},
                timeout: 60000
            }
        );

        const candidate = response.data.candidates?.[0];
        return await _handleGeminiResponse(candidate, message, conversationHistory, apiKey, isRestrictedMode, useWebSearch);

    } catch (error) {
        console.error('❌ Gemini API Error:', error.response?.data || error.message);
        throw error;
    }
}


export async function callSimpleGeminiAPI(message, apiKey) {
    if (!apiKey) throw new Error("API Key is missing");

    try {
        const requestBody = {
            contents: [{
                role: 'user',
                parts: [{text: message}]
            }]
        };

        const response = await axios.post(
            `${GEMINI_API_URL}?key=${apiKey}`,
            requestBody,
            {
                headers: {'Content-Type': 'application/json'},
                timeout: 30000
            }
        );

        const candidate = response.data.candidates?.[0];
        if (!candidate || !candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
            throw new Error('No valid content received');
        }

        return candidate.content.parts[0].text;

    } catch (error) {
        console.error('❌ Simple Gemini API Error:', error.response?.data || error.message);
        throw error;
    }
}

function _formatConversationContents(conversationHistory, newMessage) {
    const contents = [];

    conversationHistory.forEach(msg => {
        if (msg.role === 'tool_response') {
            contents.push({
                role: 'function',
                parts: [{
                    functionResponse: {
                        name: msg.name,
                        response: msg.content
                    }
                }]
            });
        } else if (msg.role === 'tool_request') {
            contents.push({
                role: 'model',
                parts: [{
                    functionCall: {
                        name: msg.name,
                        args: msg.args
                    }
                }]
            });
        } else {
            contents.push({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{text: msg.content}]
            });
        }
    });

    contents.push({
        role: 'user',
        parts: [{text: newMessage}]
    });

    return contents;
}

async function _handleGeminiResponse(
    candidate,
    originalMessage,
    currentConversationHistory,
    apiKey,
    isRestrictedMode,
    useWebSearch = false
) {
    if (!candidate || !candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
        throw new Error('No valid content received from Gemini API.');
    }

    const firstPart = candidate.content.parts[0];

    if (firstPart.functionCall) {
        if (isRestrictedMode) return "I apologize, but I cannot perform external actions in this mode.";

        const functionCall = firstPart.functionCall;
        const toolName = functionCall.name;
        const toolArgs = functionCall.args;

        console.log(`🤖 Gemini requested to call tool: ${toolName} with arguments:`, toolArgs);

        if (EXECUTING_TOOLS[toolName]) {
            let toolResult;
            try {
                if (toolName === 'getCurrentWeather') {
                    toolResult = await EXECUTING_TOOLS[toolName](toolArgs.location, toolArgs.unit);
                } else if (toolName === 'getWebSearch') {
                    toolResult = await EXECUTING_TOOLS[toolName](toolArgs.query);
                } else if (toolName === 'getBusinessInfo') {
                    toolResult = await EXECUTING_TOOLS[toolName]();
                } else {
                    toolResult = await EXECUTING_TOOLS[toolName](toolArgs);
                }
            } catch (error) {
                console.error(`❌ Tool "${toolName}" execution failed:`, error.message);
                toolResult = `Error executing tool: ${error.message}`;
            }

            console.log(`✅ Tool "${toolName}" executed successfully. Result:`, toolResult);

            const newConversationHistory = [
                ...currentConversationHistory,
                {role: 'user', content: originalMessage},
                {role: 'tool_request', name: toolName, args: toolArgs},
                {role: 'tool_response', name: toolName, content: toolResult}
            ];

            return await callGeminiAPI("continue", newConversationHistory, apiKey, isRestrictedMode, useWebSearch);

        } else {
            throw new Error(`Tool "${toolName}" declared by Gemini is not found in your EXECUTING_TOOLS mapping.`);
        }
    } else if (firstPart.text) {
        return firstPart.text;
    } else {
        throw new Error('Unexpected part type in Gemini response.');
    }
}