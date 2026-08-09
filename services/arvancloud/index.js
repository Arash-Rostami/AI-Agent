import {
    ARVANCLOUD_API_KEY,
    ARVANCLOUD_CHATGPT_URL,
    ARVANCLOUD_GEMINI_URL,
    ARVANCLOUD_THINKING_URL,
    SYSTEM_INSTRUCTION_TEXT
} from '../../config/index.js';
import {allToolDefinitions} from '../../tools/toolDefinitions.js';
import {toOpenAiTools} from '../../tools/openAiFormat.js';
import {getAllowedTools, isToolExecutionAllowed} from '../gemini/formatter.js';
import {executeTool, safeParseArgs} from '../gemini/toolHandler.js';

if (!ARVANCLOUD_API_KEY) console.warn('ARVANCLOUD_API_KEY is not set.');

export const ARVAN_CHATGPT_MODEL_ID = 'GPT-OSS-120B-burmt';
export const ARVAN_GEMINI_MODEL_ID = 'Gemini-3.1-Flash-Lite-Preview-8dzyx';
export const ARVAN_THINKING_MODEL_ID = 'Gemini-3-Flash-Preview-kc6io';
// No current ArvanCloud model is vision-capable.
const VISION_CAPABLE_MODELS = [];
// Hard cap on tool-call round trips per request.
const MAX_TOOL_ROUNDS = 5;

const MODELS = {
    [ARVAN_CHATGPT_MODEL_ID]: {url: ARVANCLOUD_CHATGPT_URL, id: ARVAN_CHATGPT_MODEL_ID},
    [ARVAN_GEMINI_MODEL_ID]: {url: ARVANCLOUD_GEMINI_URL, id: ARVAN_GEMINI_MODEL_ID},
    [ARVAN_THINKING_MODEL_ID]: {url: ARVANCLOUD_THINKING_URL, id: ARVAN_THINKING_MODEL_ID},
};

function resolveModel(model) {
    const entry = MODELS[model];
    if (!entry) throw new Error('Invalid model selected for ArvanCloud!');
    if (!entry.url) throw new Error(`Endpoint URL for model ${model} is not configured.`);
    return entry;
}

// Strips leaked OpenAI "harmony" format tokens (e.g. <|channel|>...<|call|>) GPT-OSS-120B can emit as plain text instead of declining.
function stripHarmonyArtifacts(content) {
    if (typeof content !== 'string') return content;
    const marker = content.indexOf('<|');
    return marker === -1 ? content : content.slice(0, marker).trim();
}

function buildUserContent(message, fileData, modelId) {
    if (fileData && VISION_CAPABLE_MODELS.includes(modelId)) {
        return [
            {type: "text", text: message},
            {type: "image_url", image_url: {url: fileData}}
        ];
    }
    return message;
}

async function postChatCompletion(endpointUrl, modelId, messages, tools, timeoutMs) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const response = await fetch(endpointUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `apikey ${ARVANCLOUD_API_KEY}`
            },
            body: JSON.stringify({
                model: modelId,
                messages,
                max_tokens: 3000,
                temperature: 0.7,
                ...(tools ? {tools, tool_choice: 'auto'} : {})
            }),
            signal: controller.signal
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`ArvanCloud API Error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        const choice = data?.choices?.[0]?.message;
        if (!choice) throw new Error('No content returned from ArvanCloud API');
        return choice;
    } catch (error) {
        if (error.name === 'AbortError') throw new Error(`ArvanCloud API timed out after ${timeoutMs}ms`);
        console.error('ArvanCloud API call failed:', error);
        throw error;
    } finally {
        clearTimeout(timeout);
    }
}

export default async function callArvanCloudAPI(message, conversationHistory = [], model, fileData = null, customSystemInstruction = null, timeoutMs = 60000) {
    if (!message || typeof message !== 'string') throw new Error('Message must be a non-empty string');

    const {url: endpointUrl, id: modelId} = resolveModel(model);

    const messages = [
        {role: 'system', content: customSystemInstruction || SYSTEM_INSTRUCTION_TEXT},
        ...conversationHistory.map(m => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content
        })),
        {role: 'user', content: buildUserContent(message, fileData, modelId)}
    ];

    const choice = await postChatCompletion(endpointUrl, modelId, messages, undefined, timeoutMs);
    const content = stripHarmonyArtifacts(choice.content);
    if (!content) throw new Error('No content returned from ArvanCloud API');
    return content;
}

// Reuses Gemini's tool definitions/gating/execution, converted to OpenAI's tool format.
export async function callArvanCloudAPIWithTools(message, conversationHistory = [], model, fileData = null, customSystemInstruction = null, options = {}) {
    if (!message || typeof message !== 'string') throw new Error('Message must be a non-empty string');

    const {
        isRestrictedMode = false,
        useWebSearch = false,
        isBmsMode = false,
        isEteqMode = false,
        timeoutMs = 60000
    } = options;

    const {url: endpointUrl, id: modelId} = resolveModel(model);

    const geminiFormatAllowed = getAllowedTools(isRestrictedMode, useWebSearch, allToolDefinitions, isBmsMode, isEteqMode);
    const tools = geminiFormatAllowed ? toOpenAiTools(geminiFormatAllowed) : undefined;

    const messages = [
        {role: 'system', content: customSystemInstruction || SYSTEM_INSTRUCTION_TEXT},
        ...conversationHistory.map(m => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content
        })),
        {role: 'user', content: buildUserContent(message, fileData, modelId)}
    ];

    let sources = [];

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        const choice = await postChatCompletion(endpointUrl, modelId, messages, tools, timeoutMs);

        if (!choice.tool_calls || choice.tool_calls.length === 0) {
            const cleaned = stripHarmonyArtifacts(choice.content);
            return {text: cleaned || "I'm not able to perform that action in this mode.", sources};
        }

        messages.push(choice);

        for (const toolCall of choice.tool_calls) {
            const toolName = toolCall.function.name;
            console.log(`🤖 ArvanCloud (${modelId}) requested to call tool: ${toolName} with arguments:`, toolCall.function.arguments);

            let toolResult;
            if (!isToolExecutionAllowed(toolName, isRestrictedMode, useWebSearch, isBmsMode, isEteqMode)) {
                console.log(`🚫 Blocked tool call in restricted mode. toolName=${toolName}, isBmsMode=${isBmsMode}, isEteqMode=${isEteqMode}`);
                toolResult = {error: 'This action is not permitted in the current mode.'};
            } else {
                try {
                    const toolArgs = safeParseArgs(toolCall.function.arguments);
                    toolResult = await executeTool(toolName, toolArgs);
                    if (toolName === 'getWebSearch' && toolResult?.sources) sources = toolResult.sources;
                    console.log(`✅ Tool "${toolName}" executed successfully.`);
                } catch (error) {
                    console.error(`❌ Tool "${toolName}" execution failed:`, error.message);
                    toolResult = {error: `Error executing tool: ${error.message}`};
                }
            }

            messages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: JSON.stringify(toolResult)
            });
        }
    }

    return {text: "I executed the requested tool(s) but reached the maximum number of steps without a final answer. Please try again.", sources};
}
