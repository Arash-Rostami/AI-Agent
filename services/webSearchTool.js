import { search } from "@navetacandra/ddg";

export async function getWebSearch(query) {
    if (!query) throw new Error('Search key is required.');


    try {
        console.log(`🔍 Searching the web for: "${query}"`);
        const searchResponse = await search({ query: query }, "web");

        // The library returns { data: [...], ... }
        const results = searchResponse.data;

        if (!results || !Array.isArray(results) || results.length === 0) {
            return { results: "No results found." };
        }

        // Limit to top 7 results
        const topResults = results.slice(0, 7).map(result => {
            return `Title: ${result.title}\nLink: ${result.url}\nSnippet: ${result.description || 'No description available.'}\n`;
        });

        // Return an object to satisfy Gemini's Struct requirement
        return {
            results: topResults.join('\n---\n')
        };

    } catch (error) {
        console.error('❌ Web Search Error:', error.message);
        throw new Error(`Failed to perform web search for "${query}".`);
    }
}
