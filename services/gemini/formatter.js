export function formatContents(conversationHistory, newMessage, fileData = null) {
    const contents = conversationHistory.map(msg => {
        if (msg.role === 'tool_response') {
            return {role: 'function', parts: [{functionResponse: {name: msg.name, response: msg.content}}]};
        }
        if (msg.role === 'tool_request') {
            return {role: 'model', parts: [{functionCall: {name: msg.name, args: msg.args}}]};
        }
        return {role: msg.role === 'assistant' ? 'model' : 'user', parts: [{text: msg.content}]};
    });

    const parts = [{text: newMessage}];
    if (fileData) parts.push({inlineData: {mimeType: fileData.mimeType, data: fileData.data}});

    contents.push({role: 'user', parts});
    return contents;
}

export function getAllowedTools(isRestrictedMode, useWebSearch, allTools, isBmsMode = false) {
    const isWebSearchTool = (t) => t.functionDeclarations?.some(fd => fd.name === 'getWebSearch');
    const isBmsTool = (t) => t.functionDeclarations?.some(fd => fd.name === 'searchBmsDatabase');

    if (isBmsMode) {
        return allTools.filter(t => !isWebSearchTool(t));
    }

    if (isRestrictedMode) {
        return useWebSearch ? allTools.filter(isWebSearchTool) : undefined;
    }
    return useWebSearch ? allTools : allTools.filter(t => !isWebSearchTool(t));
}