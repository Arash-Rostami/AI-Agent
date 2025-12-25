import {getCurrentWeather} from '../services/weatherTool.js';
import {getBusinessInfo} from '../services/persolBSDocumentTool.js';
import {getWebSearch} from '../services/webSearchTool.js';
import {searchBmsDatabase} from '../services/bmsTool.js';
import {crawlWebPage} from '../services/webCrawlerTool.js';
import {scrapeWebPage} from '../services/webScraperTool.js';

import {weatherToolDefinition} from './weather/weatherDefinition.js';
import {persolBSDocumentDefinition} from "./documentReader/persolBSDocumentDefinition.js";
import {webSearchToolDefinition} from "./webSearch/webSearchDefinition.js";
import {bmsToolDefinition} from "./bms/bmsDefinition.js";
import {webCrawlerToolDefinition} from "./webCrawler/webCrawlerDefinition.js";
import {webScraperToolDefinition} from "./webScrape/webScraperDefinition.js";


//Lists of Tool Definitions/Annotations/Descriptions
export const allToolDefinitions = [
    weatherToolDefinition,
    persolBSDocumentDefinition,
    webSearchToolDefinition,
    bmsToolDefinition,
    webCrawlerToolDefinition,
    webScraperToolDefinition
];

// Lists of Tools
export const availableTools = {
    getCurrentWeather: getCurrentWeather,
    getBusinessInfo: getBusinessInfo,
    getWebSearch: getWebSearch,
    searchBmsDatabase: searchBmsDatabase,
    crawlWebPage: crawlWebPage,
    scrapeWebPage: scrapeWebPage
};
