import {search} from "@navetacandra/ddg";

export async function getWebSearch(query) {
    if (!query) throw new Error('Search key is required.');

    try {
        console.log(`🔍 Searching the web for: "${query}"`);
        const searchResponse = await search({query: query}, "web");
        const results = searchResponse.data;

        if (!results || !Array.isArray(results) || results.length === 0) return {results: "No results found."};

        // Limit to top 7 results
        const limitedResults = results.slice(0, 7);
        const stringResult = limitedResults.map(result => {
            return `Title: ${result.title}\nLink: ${result.url}\nSnippet: ${result.description || 'No description available.'}\n`;
        }).join('\n---\n');

        const sources = limitedResults.map(result => ({
            title: result.title,
            url: result.url,
            snippet: result.description
        }));

        return {
            results: stringResult,
            sources: sources
        };

    } catch (error) {
        console.error('❌ Web Search Error:', error.message);
        throw new Error(`Failed to perform web search for "${query}".`);
    }
}