import {getCurrentWeather} from '../services/weatherTool.js';
import {weatherToolDefinition} from './weather/weatherDefinition.js';


//Lists of Tool Definitions/Annotations/Descriptions
export const allToolDefinitions = [
    weatherToolDefinition,
];

// Lists of Tools
export const availableTools = {
    getCurrentWeather: getCurrentWeather,
};