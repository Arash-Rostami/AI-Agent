import { CheerioCrawler } from 'crawlee';
import * as cheerio from 'cheerio';


export async function crawlWebPage(url) {
    if (!url) throw new Error('URL is required for crawling.');

    console.log(`🕷️ Crawling URL: ${url}`);

    let pageTitle = '';
    let pageContent = '';

    const crawler = new CheerioCrawler({
        maxRequestsPerCrawl: 1, 
        requestHandler: async ({ $, request }) => {
            pageTitle = $('title').text().trim();
            
            $('script, style, nav, footer, header, aside, .ads, #ads').remove();
            
            const bodyText = $('body').text();
            pageContent = bodyText
                .replace(/\s\s+/g, ' ')
                .replace(/\n\s*\n/g, '\n')
                .trim()
                .substring(0, 15000);
        },
        failedRequestHandler: ({ request }) => {
            console.error(`❌ Crawling failed for ${request.url}`);
        },
    });

    try {
        await crawler.run([url]);
        
        if (!pageContent || pageContent.length < 50) {
            return {
                url,
                title: pageTitle || 'Unknown Title',
                content: "Warning: The crawler successfully accessed the URL but found very little text. This site may be a Single Page Application (SPA) requiring JavaScript, which is not supported by this tool. The AI should inform the user about this technical limitation."
            };
        }

        return {
            url,
            title: pageTitle,
            content: pageContent
        };
    } catch (error) {
        console.error('❌ Crawler Error:', error.message);
        throw new Error(`Failed to crawl the page at "${url}".`);
    }
}
