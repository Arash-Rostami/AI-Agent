import {getAirQuality, getCurrentWeather, getWeatherForecast} from '../services/weatherTool.js';
import {getCurrentTime} from '../services/timeTool.js';
import {getBusinessInfo} from '../services/persolBSDocumentTool.js';
import {getWebSearch} from '../services/webSearchTool.js';
import {searchBmsDatabase} from '../services/bmsTool.js';
import {crawlWebPage} from '../services/webCrawlerTool.js';
import {sendEmail} from '../services/emailTool.js';



import {weatherToolDefinition} from './weather/weatherDefinition.js';
import {timeToolDefinition} from "./time/timeDefinition.js";
import {persolBSDocumentDefinition} from "./documentReader/persolBSDocumentDefinition.js";
import {webSearchToolDefinition} from "./webSearch/webSearchDefinition.js";
import {bmsToolDefinition} from "./bms/bmsDefinition.js";
import {webCrawlerToolDefinition} from "./webCrawler/webCrawlerDefinition.js";
import {emailToolDefinition} from "./email/emailDefinition.js";



//Lists of Tool Definitions/Annotations/Descriptions
export const allToolDefinitions = [
    weatherToolDefinition,
    timeToolDefinition,
    persolBSDocumentDefinition,
    webSearchToolDefinition,
    bmsToolDefinition,
    webCrawlerToolDefinition,
    emailToolDefinition,
];

// Lists of Tools
export const availableTools = {
    getCurrentWeather: getCurrentWeather,
    getWeatherForecast: getWeatherForecast,
    getAirQuality: getAirQuality,
    getCurrentTime: getCurrentTime,
    getBusinessInfo: getBusinessInfo,
    getWebSearch: getWebSearch,
    searchBmsDatabase: searchBmsDatabase,
    crawlWebPage: crawlWebPage,
    sendEmail: sendEmail,
};
