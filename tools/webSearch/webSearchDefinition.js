export const webSearchToolDefinition = {
    name: "getWebSearch",
    description: "Performs a web search to retrieve current information,relevant data, news, or answers to questions that require external knowledge.",
    parameters: {
        type: "OBJECT",
        properties: {
            query: {
                type: "STRING",
                description: "The search query or keywords to look up on the web."
            }
        },
        required: ["query"]
    }
};