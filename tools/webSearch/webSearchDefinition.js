export const webSearchToolDefinition = {
    name: "performWebSearch",
    description: "Performs a web search to retrieve current information, news, or answers to questions that require external knowledge.",
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
