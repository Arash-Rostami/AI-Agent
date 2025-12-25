import { CheerioCrawler, Configuration } from 'crawlee';
import * as cheerio from 'cheerio';
import path from 'path';
import fs from 'fs';


export async function crawlWebPage(url) {
    if (!url) throw new Error('URL is required for crawling.');

    console.log(`🕷️ Crawling URL: ${url}`);

    let pageTitle = '';
    let pageContent = '';

    // Create a unique storage directory inside ./data/crawler
    const uniqueId = Date.now().toString() + Math.random().toString(36).substring(7);
    const storagePath = path.resolve('./data/crawler', uniqueId);

    // Ensure the data directory exists
    if (!fs.existsSync(path.resolve('./data'))) {
        fs.mkdirSync(path.resolve('./data'));
    }

    const config = new Configuration({
        persistStorage: false,
        storageClientOptions: {
            storageDir: storagePath,
        },
        purgeOnStart: true,
    });

    const crawler = new CheerioCrawler({
        maxRequestsPerCrawl: 2,
        maxRequestRetries: 1,
        requestHandlerTimeoutSecs: 15,
        ignoreSslErrors: true,
        additionalMimeTypes: ['text/html', 'application/xhtml+xml'],
        preNavigationHooks: [
            async ({ request, page, session }) => {
                request.headers = {
                    ...request.headers,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                };
            }
        ],
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
    }, config);

    try {
        await crawler.run([url]);
        
        // Clean up storage after run
        try {
            if (fs.existsSync(storagePath)) {
                fs.rmSync(storagePath, { recursive: true, force: true });
            }
        } catch (cleanupError) {
            console.warn(`Warning: Failed to clean up crawler storage at ${storagePath}:`, cleanupError.message);
        }

        // If content is empty or crawler got blocked (0 finished requests implies it didn't even parse)
        if (!pageContent || pageContent.length < 50) {
            // Check if we suspect a block or simple empty content
            return {
                url,
                title: pageTitle || 'Access Issue',
                content: "Warning: The crawler could not extract content. The site might be blocking automated access (WAF), requires JavaScript (SPA), or refused the connection. Suggest the user to copy-paste the content."
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
