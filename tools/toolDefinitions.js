import {getCurrentWeather} from '../services/weatherTool.js';
import {getBusinessInfo} from '../services/persolBSDocumentTool.js';
import {performWebSearch} from '../services/webSearchTool.js';
import {weatherToolDefinition} from './weather/weatherDefinition.js';
import {persolBSDocumentDefinition} from "./documentReader/persolBSDocumentDefinition.js";
import {webSearchToolDefinition} from "./webSearch/webSearchDefinition.js";


//Lists of Tool Definitions/Annotations/Descriptions
export const allToolDefinitions = [
    weatherToolDefinition,
    persolBSDocumentDefinition,
    webSearchToolDefinition
];

// Lists of Tools
export const availableTools = {
    getCurrentWeather: getCurrentWeather,
    getBusinessInfo: getBusinessInfo,
    performWebSearch: performWebSearch
};
