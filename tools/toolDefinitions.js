import {getCurrentWeather} from '../services/weatherTool.js';
import {getBusinessInfo} from '../services/persolBSDocumentTool.js';
import {weatherToolDefinition} from './weather/weatherDefinition.js';
import {persolBSDocumentDefinition} from "./documentReader/persolBSDocumentDefinition.js";


//Lists of Tool Definitions/Annotations/Descriptions
export const allToolDefinitions = [
    weatherToolDefinition,
    persolBSDocumentDefinition
];

// Lists of Tools
export const availableTools = {
    getCurrentWeather: getCurrentWeather,
    getBusinessInfo: getBusinessInfo
};