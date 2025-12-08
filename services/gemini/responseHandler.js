import {availableTools} from '../../tools/toolDefinitions.js';
import {callGeminiAPI} from './index.js';

export async function handle(candidate, originalMessage, currentConversationHistory, apiKey, isRestrictedMode, useWebSearch, keyIdentifier) {
    if (!candidate?.content?.parts?.[0]) {
        throw new Error('No valid content received from Gemini API.');
    }

    const firstPart = candidate.content.parts[0];

    if (firstPart.functionCall) {
        return await handleToolCall(firstPart.functionCall, originalMessage, currentConversationHistory, apiKey, isRestrictedMode, useWebSearch, keyIdentifier);
    }

    if (firstPart.text) {
        return {text: firstPart.text, sources: []};
    }

    throw new Error('Unexpected part type in Gemini response.');
}

async function handleToolCall(functionCall, originalMessage, currentConversationHistory, apiKey, isRestrictedMode, useWebSearch, keyIdentifier) {
    const {name: toolName, args: toolArgs} = functionCall;
    let sources = [];

    console.log(`🤖 Gemini requested to call tool: ${toolName} with arguments:`, toolArgs);

    if (isRestrictedMode && (!useWebSearch || toolName !== 'getWebSearch')) {
        console.log(`🚫 Blocked tool call in restricted mode. isRestrictedMode=${isRestrictedMode}, useWebSearch=${useWebSearch}, toolName=${toolName}`);
        return {text: "I apologize, but I cannot perform external actions in this mode.", sources: []};
    }

    if (!availableTools[toolName]) {
        throw new Error(`Tool "${toolName}" declared by Gemini is not found in your EXECUTING_TOOLS mapping.`);
    }

    let toolResult;
    try {
        if (toolName === 'getCurrentWeather') {
            toolResult = await availableTools[toolName](toolArgs.location, toolArgs.unit);
        } else if (toolName === 'getWebSearch') {
            toolResult = await availableTools[toolName](toolArgs.query);
            if (toolResult?.sources) sources = toolResult.sources;
        } else if (toolName === 'getBusinessInfo') {
            toolResult = await availableTools[toolName]();
        } else {
            toolResult = await availableTools[toolName](toolArgs);
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

    const nextResponse = await callGeminiAPI("continue", newConversationHistory, apiKey, isRestrictedMode, useWebSearch, keyIdentifier);

    return {
        text: nextResponse.text,
        sources: [...sources, ...nextResponse.sources]
    };
}