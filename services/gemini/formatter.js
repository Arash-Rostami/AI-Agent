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

export function getAllowedTools(isRestrictedMode, useWebSearch, allTools, isBmsMode = false) {
    const isWebSearchTool = (t) => t.functionDeclarations?.some(fd => fd.name === 'getWebSearch');
    const isBmsTool = (t) => t.functionDeclarations?.some(fd => fd.name === 'search_bms_database');

    if (isBmsMode) {
        // In BMS Mode, allow BMS tool. Disable web search as requested.
        // User said: "remove websearch". Assuming other tools are fine or just BMS.
        // Usually, restricted environments might want only specific tools.
        // I'll return standard tools + BMS tool - websearch.
        // Wait, if I look at standard logic: "useWebSearch ? allTools : allTools.filter(t => !isWebSearchTool(t))"
        // If isBmsMode, we force websearch off.
        // But we must ensure BMS tool is present.
        // Is BMS tool in "allTools"? Yes, I added it.
        // So we just need to filter out websearch.
        return allTools.filter(t => !isWebSearchTool(t));
    }

    if (isRestrictedMode) {
        return useWebSearch ? allTools.filter(isWebSearchTool) : undefined;
    }
    return useWebSearch ? allTools : allTools.filter(t => !isWebSearchTool(t));
}