export const webScraperToolDefinition = {
    functionDeclarations: [
        {
            name: "scrapeWebPage",
            description: "Scrapes content from a given URL using Apify. Provide the URL of the website to scrape.",
            parameters: {
                type: "OBJECT", properties: {
                    url: {
                        type: "STRING", description: "The URL of the website to scrape."
                    }
                }, required: ["url"]
            }
        }
    ]
};
