import { search } from "@navetacandra/ddg";

/**
 * Performs a web search using DuckDuckGo.
 * @param {string} query - The search query.
 * @returns {Promise<string>} - A formatted string of search results.
 */
export async function performWebSearch(query) {
    if (!query) {
        throw new Error('Search query is required.');
    }

    try {
        console.log(`🔍 Searching the web for: "${query}"`);
        const results = await search({ query: query }, "web");

        if (!results || results.length === 0) {
            return "No results found.";
        }

        // Limit to top 5 results to keep context size manageable
        const topResults = results.slice(0, 5).map(result => {
            return `Title: ${result.title}\nLink: ${result.url}\nSnippet: ${result.description || 'No description available.'}\n`;
        });

        return topResults.join('\n---\n');

    } catch (error) {
        console.error('❌ Web Search Error:', error.message);
        throw new Error(`Failed to perform web search for "${query}".`);
    }
}
