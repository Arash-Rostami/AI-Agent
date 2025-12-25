import {ApifyClient} from 'apify-client';
import {APIFY_API_KEY, APIFY_STORAGE_DIR} from '../config/index.js';

if (APIFY_STORAGE_DIR) process.env.APIFY_LOCAL_STORAGE_DIR = APIFY_STORAGE_DIR;

const client = new ApifyClient({token: APIFY_API_KEY});

export const scrapeWebPage = async (url) => {
    const run = await client.actor('apify/web-scraper').call({
        startUrls: [{url}],
        linkSelector: 'a[href]',
        pageFunction: `async function pageFunction(context) {
            return {
                url: context.request.url,
                title: context.jQuery('title').text(),
                text: context.jQuery('body').text().trim()
            };
        }`,
        maxCrawlDepth: 0,
        maxCrawlPages: 1
    });

    const {items} = await client.dataset(run.defaultDatasetId).listItems();
    return items;
};