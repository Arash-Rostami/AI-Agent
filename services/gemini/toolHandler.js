import {availableTools} from '../../tools/toolDefinitions.js';

export const TOOL_ARG_MAPPER = {
    getCurrentWeather: ({location, unit} = {}) => [location, unit],
    getWeatherForecast: ({location, unit} = {}) => [location, unit],
    getAirQuality: ({location} = {}) => [location],
    getCurrentTime: ({timezone} = {}) => [timezone],
    getWebSearch: ({query} = {}) => [query],
    crawlWebPage: ({url} = {}) => [url],
    getBusinessInfo: () => [],
    searchBmsDatabase: ({query, entity_type} = {}) => [query, entity_type]
};

export function safeParseArgs(args) {
    if (!args) return {};
    if (typeof args === 'string') {
        try {
            return JSON.parse(args);
        } catch {
            return {raw: args};
        }
    }
    return args;
}

export async function executeTool(toolName, toolArgs) {
    const toolFn = availableTools[toolName];
    if (!toolFn) throw new Error(`Tool "${toolName}" is not available.`);

    const mapper = TOOL_ARG_MAPPER[toolName];
    const argsArray = mapper ? mapper(toolArgs) : [toolArgs];
    return await toolFn(...argsArray);
}
