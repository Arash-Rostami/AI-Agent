export const webCrawlerToolDefinition = {
    functionDeclarations: [
        {
            name: "crawlWebPage",
            description: "Crawls a specific URL to extract its main text content. Use this when you need deep information from a specific website or when a search result snippet is not enough.",
            parameters: {
                type: "OBJECT",
                properties: {
                    url: {
                        type: "STRING",
                        description: "The full URL of the web page to crawl (e.g., https://example.com/article)."
                    }
                },
                required: ["url"]
            }
        }
    ]
};
