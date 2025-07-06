import axios from "axios";
import {GEMINI_API_KEY, GEMINI_API_URL} from "../config/index.js";
import {allToolDefinitions, availableTools} from "../tools/toolDefinitions.js";

const API_KEY = GEMINI_API_KEY;
const API_URL = GEMINI_API_URL;
const TOOL_DEFINITIONS = allToolDefinitions;
const EXECUTING_TOOLS = availableTools;


export default async function callGeminiAPI(message, conversationHistory = []) {
    try {
        const contents = _formatConversationContents(conversationHistory, message);

        const requestBody = {
            contents,
            tools: TOOL_DEFINITIONS
        };

        const response = await axios.post(
            `${API_URL}?key=${API_KEY}`, // Use module-scoped constants
            requestBody,
            {
                headers: {
                    'Content-Type': 'application/json',
                },
                timeout: 60000
            }
        );

        const candidate = response.data.candidates?.[0];
        return await _handleGeminiResponse(candidate, message, conversationHistory);

    } catch (error) {
        console.error('❌ Gemini API Error:', error.response?.data || error.message);
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

async function _handleGeminiResponse(candidate, originalMessage, currentConversationHistory) {
    if (!candidate || !candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
        throw new Error('No valid content received from Gemini API.');
    }

    const firstPart = candidate.content.parts[0];

    if (firstPart.functionCall) {
        const functionCall = firstPart.functionCall;
        const toolName = functionCall.name;
        const toolArgs = functionCall.args;

        console.log(`🤖 Gemini requested to call tool: ${toolName} with arguments:`, toolArgs);

        if (EXECUTING_TOOLS[toolName]) {
            const toolResult = await EXECUTING_TOOLS[toolName](toolArgs.location, toolArgs.unit);

            console.log(`✅ Tool "${toolName}" executed successfully. Result:`, toolResult);

            const newConversationHistory = [
                ...currentConversationHistory,
                {role: 'user', content: originalMessage},
                {role: 'tool_request', name: toolName, args: toolArgs},
                {role: 'tool_response', name: toolName, content: toolResult}
            ];

            return await callGeminiAPI("continue", newConversationHistory);

        } else {
            throw new Error(`Tool "${toolName}" declared by Gemini is not found in your EXECUTING_TOOLS mapping.`);
        }
    } else if (firstPart.text) {
        return firstPart.text;
    } else {
        throw new Error('Unexpected part type in Gemini response.');
    }
}


