export function formatContents(conversationHistory, newMessage) {
    const contents = conversationHistory.map(msg => {
        if (msg.role === 'tool_response') {
            return {role: 'function', parts: [{functionResponse: {name: msg.name, response: msg.content}}]};
        }
        if (msg.role === 'tool_request') {
            return {role: 'model', parts: [{functionCall: {name: msg.name, args: msg.args}}]};
        }
        return {role: msg.role === 'assistant' ? 'model' : 'user', parts: [{text: msg.content}]};
    });

    contents.push({role: 'user', parts: [{text: newMessage}]});
    return contents;
}

export function getAllowedTools(isRestrictedMode, useWebSearch, allTools) {
    const isWebSearchTool = (t) => t.functionDeclarations?.some(fd => fd.name === 'getWebSearch');

    if (isRestrictedMode) {
        return useWebSearch ? allTools.filter(isWebSearchTool) : undefined;
    }
    return useWebSearch ? allTools : allTools.filter(t => !isWebSearchTool(t));
}