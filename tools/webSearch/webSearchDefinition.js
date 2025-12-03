export const webSearchToolDefinition = {
    functionDeclarations: [
        {
            name: "getWebSearch",
            description: "Performs a web search to retrieve current information, news, or answers. The tool returns a list of search results, each containing a title, link, and a descriptive snippet. **You must use these snippets to answer the user's question.** Do not ask the user to check the links themselves unless the snippets are insufficient.",
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
        }
    ]
};
