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
        
        if (!pageContent) {
            return {
                url,
                title: pageTitle,
                content: "Could not extract meaningful content from this page. It might be protected or require JavaScript rendering."
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
