import {getCurrentWeather, getWeatherForecast, getAirQuality} from '../services/weatherTool.js';
import {getBusinessInfo} from '../services/persolBSDocumentTool.js';
import {getWebSearch} from '../services/webSearchTool.js';
import {searchBmsDatabase} from '../services/bmsTool.js';
import {crawlWebPage} from '../services/webCrawlerTool.js';
import {getCurrentTime} from '../services/timeTool.js';

import {weatherToolDefinition} from './weather/weatherDefinition.js';
import {persolBSDocumentDefinition} from "./documentReader/persolBSDocumentDefinition.js";
import {webSearchToolDefinition} from "./webSearch/webSearchDefinition.js";
import {bmsToolDefinition} from "./bms/bmsDefinition.js";
import {webCrawlerToolDefinition} from "./webCrawler/webCrawlerDefinition.js";
import {timeToolDefinition} from "./time/timeDefinition.js";


//Lists of Tool Definitions/Annotations/Descriptions
export const allToolDefinitions = [
    weatherToolDefinition,
    persolBSDocumentDefinition,
    webSearchToolDefinition,
    bmsToolDefinition,
    webCrawlerToolDefinition,
    timeToolDefinition,
];

// Lists of Tools
export const availableTools = {
    getCurrentWeather: getCurrentWeather,
    getWeatherForecast: getWeatherForecast,
    getAirQuality: getAirQuality,
    getBusinessInfo: getBusinessInfo,
    getWebSearch: getWebSearch,
    searchBmsDatabase: searchBmsDatabase,
    crawlWebPage: crawlWebPage,
    getCurrentTime: getCurrentTime,
};
