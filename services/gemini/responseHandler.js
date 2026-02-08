import {executeTool, safeParseArgs} from './toolHandler.js';
import {callGeminiAPI} from './index.js';

export async function handle(
    candidate,
    originalMessage,
    currentConversationHistory,
    apiKey,
    isRestrictedMode,
    useWebSearch,
    keyIdentifier,
    isBmsMode = false,
    isEteqMode = false
) {
    if (!candidate?.content?.parts?.[0]) throw new Error('No valid content received from Gemini API.');

    const firstPart = candidate.content.parts[0];
    if (firstPart.functionCall) {
        return await handleToolCall(firstPart.functionCall, originalMessage, currentConversationHistory, apiKey, isRestrictedMode, useWebSearch, keyIdentifier, isBmsMode, isEteqMode);
    }
    if (firstPart.text) return {text: firstPart.text, sources: []};

    throw new Error('Unexpected part type in Gemini response.');
}

async function handleToolCall(
    functionCall,
    originalMessage,
    currentConversationHistory,
    apiKey,
    isRestrictedMode,
    useWebSearch,
    keyIdentifier,
    isBmsMode = false,
    isEteqMode = false
) {
    const {name: toolName, args: rawArgs} = functionCall;
    let sources = [];
    let toolArgs;
    let toolResult;

    console.log(`🤖 Gemini requested to call tool: ${toolName} with arguments:`, rawArgs);

    if (isRestrictedMode) {
        const isBmsAllowed = (toolName === 'searchBmsDatabase' && isBmsMode);
        const isEteqAllowed = isEteqMode && (toolName === 'sendEmail' || (useWebSearch && (toolName === 'getWebSearch' || toolName === 'crawlWebPage')));
        const isWebSearchAllowed = (toolName === 'getWebSearch' || toolName === 'crawlWebPage') && useWebSearch;

        const allowed = isBmsAllowed || isEteqAllowed || isWebSearchAllowed;

        if (!allowed) {
            console.log(`🚫 Blocked tool call in restricted mode. isRestrictedMode=${isRestrictedMode}, useWebSearch=${useWebSearch}, toolName=${toolName}, isBmsMode=${isBmsMode}, isEteqMode=${isEteqMode}`);
            return {text: "I apologize, but I cannot perform external actions in this mode.", sources: []};
        }
    }

    try {
        toolArgs = safeParseArgs(rawArgs);
        toolResult = await executeTool(toolName, toolArgs);
    } catch (error) {
        console.error(`❌ Tool "${toolName}" execution failed:`, error.message);
        toolResult = {error: `Error executing tool: ${error.message}`};
    }

    if (toolName === 'getWebSearch' && toolResult?.sources) sources = toolResult.sources;

    console.log(`✅ Tool "${toolName}" executed successfully.`);
    if (toolResult && typeof toolResult === 'object') {
        const preview = JSON.stringify(toolResult).substring(0, 200);
        console.log(`📄 Tool Result Preview: ${preview}...`);
    }

    const newConversationHistory = [
        ...currentConversationHistory,
        {role: 'user', content: originalMessage},
        {role: 'tool_request', name: toolName, args: toolArgs},
        {role: 'tool_response', name: toolName, content: toolResult}
    ];

    let nextResponse = {text: '', sources: []};
    try {
        nextResponse = await callGeminiAPI(
            "Tool execution complete. Please analyze the tool_response provided above and answer the user's original request.",
            newConversationHistory,
            apiKey,
            isRestrictedMode,
            useWebSearch,
            keyIdentifier,
            isBmsMode,
            null,
            null,
            false,
            isEteqMode
        ) || {text: '', sources: []};
    } catch (e) {
        console.error('❌ callGeminiAPI failed:', e?.message ?? e);
        return {
            text: "I executed the requested tool but failed to produce a follow-up explanation. Please try again.",
            sources: sources
        };
    }

    return {
        text: nextResponse.text,
        sources: [...sources, ...nextResponse.sources]
    };
}
