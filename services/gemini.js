import axios from "axios";
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {GEMINI_API_URL} from "../config/index.js";
import {allToolDefinitions, availableTools} from "../tools/toolDefinitions.js";
import {AFFIRMATION_REGEX} from '../utils/affirmationMemoryManager.js';


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
        if (isRestrictedMode && _hasUserGrantedPermission(conversationHistory)) isRestrictedMode = false;

        const contents = _formatConversationContents(conversationHistory, message);
        const isWebSearchTool = (t) => t.functionDeclarations && t.functionDeclarations.some(fd => fd.name === 'getWebSearch');

        let allowedTools = (isRestrictedMode)
            ? (useWebSearch ? TOOL_DEFINITIONS.filter(isWebSearchTool) : undefined)
            : (useWebSearch ? TOOL_DEFINITIONS : TOOL_DEFINITIONS.filter(t => !isWebSearchTool(t)));

        const requestBody = {
            contents,
            tools: allowedTools,
            tool_config: allowedTools ? {
                function_calling_config: {
                    mode: "AUTO"
                }
            } : undefined,
            systemInstruction: {
                parts: [{
                    text: isRestrictedMode && !useWebSearch
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

        // 429 Resource Exhausted Fallback
        if (error.response && error.response.status === 429) {
            const premiumKey = process.env.GEMINI_API_KEY_PREMIUM;
            if (premiumKey && apiKey !== premiumKey) {
                console.log('⚠️ Quota exceeded. Retrying with GEMINI_API_KEY_PREMIUM...');
                return callGeminiAPI(message, conversationHistory, premiumKey, isRestrictedMode, useWebSearch);
            }
        }

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

        // 429 Resource Exhausted Fallback
        if (error.response && error.response.status === 429) {
            const premiumKey = process.env.GEMINI_API_KEY_PREMIUM;
            if (premiumKey && apiKey !== premiumKey) {
                console.log('⚠️ Quota exceeded (Simple API). Retrying with GEMINI_API_KEY_PREMIUM...');
                return callSimpleGeminiAPI(message, premiumKey);
            }
        }

        throw error;
    }
}

function _hasUserGrantedPermission(history) {
    const permissionPhraseEnglish = "outside my Persol expertise";
    const permissionPhraseFarsi = "از حوزه‌ی کاری من در پرسال خارج است";

    for (let i = 0; i < history.length - 1; i++) {
        const msg = history[i];
        if (msg.role === 'assistant' && msg.content) {
            if (msg.content.includes(permissionPhraseEnglish) || msg.content.includes(permissionPhraseFarsi)) {
                const nextMsg = history[i + 1];
                if (nextMsg.role === 'user' && nextMsg.content) {
                    const userText = String(nextMsg.content).normalize('NFC');
                    if (AFFIRMATION_REGEX.test(userText)) return true;
                }
            }
        }
    }
    return false;
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
        const functionCall = firstPart.functionCall;
        const toolName = functionCall.name;
        const toolArgs = functionCall.args;
        let sources = [];

        console.log(`🤖 Gemini requested to call tool: ${toolName} with arguments:`, toolArgs);

        if (isRestrictedMode && (!useWebSearch || toolName !== 'getWebSearch')) {
            console.log(`🚫 Blocked tool call in restricted mode. isRestrictedMode=${isRestrictedMode}, useWebSearch=${useWebSearch}, toolName=${toolName}`);
            return {
                text: "I apologize, but I cannot perform external actions in this mode.",
                sources: []
            };
        }

        if (EXECUTING_TOOLS[toolName]) {
            let toolResult;
            try {
                if (toolName === 'getCurrentWeather') {
                    toolResult = await EXECUTING_TOOLS[toolName](toolArgs.location, toolArgs.unit);
                } else if (toolName === 'getWebSearch') {
                    toolResult = await EXECUTING_TOOLS[toolName](toolArgs.query);
                    if (toolResult && toolResult.sources) {
                        sources = toolResult.sources;
                    }
                } else if (toolName === 'getBusinessInfo') {
                    toolResult = await EXECUTING_TOOLS[toolName]();
                } else {
                    toolResult = await EXECUTING_TOOLS[toolName](toolArgs);
                }
            } catch (error) {
                console.error(`❌ Tool "${toolName}" execution failed:`, error.message);
                toolResult = {error: `Error executing tool: ${error.message}`};
            }

            console.log(`✅ Tool "${toolName}" executed successfully.`);


            const newConversationHistory = [
                ...currentConversationHistory,
                {role: 'user', content: originalMessage},
                {role: 'tool_request', name: toolName, args: toolArgs},
                {role: 'tool_response', name: toolName, content: toolResult}
            ];

            const nextResponse = await callGeminiAPI("continue", newConversationHistory, apiKey, isRestrictedMode, useWebSearch);

            return {
                text: nextResponse.text,
                sources: [...sources, ...nextResponse.sources]
            };
        } else {
            throw new Error(`Tool "${toolName}" declared by Gemini is not found in your EXECUTING_TOOLS mapping.`);
        }
    } else if (firstPart.text) {
        return {text: firstPart.text, sources: []};
    } else {
        throw new Error('Unexpected part type in Gemini response.');
    }
}
