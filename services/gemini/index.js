import axios from "axios";
import https from "https";
import {
    CX_BMS_INSTRUCTION,
    ETEQ_INSTRUCTION,
    GEMINI_API_KEY,
    GEMINI_API_URL,
    GEMINI_API_URL_PREMIUM,
    GEMINI_API_URL_THINKING,
    SYSTEM_INSTRUCTION_TEXT
} from "../../config/index.js";
import {allToolDefinitions} from "../../tools/toolDefinitions.js";
import * as formatter from './formatter.js';
import * as responseHandler from './responseHandler.js';
import * as errorHandler from './errorHandler.js';
import * as permissions from './permissions.js';

const keepAliveAgent = new https.Agent({ keepAlive: true });

export async function callGeminiAPI(
    message,
    conversationHistory = [],
    apiKey,
    isRestrictedMode = false,
    useWebSearch = false,
    keyIdentifier = null,
    isBmsMode = false,
    fileData = null,
    customSystemInstruction = null,
    useThinkingMode = false,
    isEteqMode = false
) {
    if (!apiKey) throw new Error("API Key is missing in callGeminiAPI");

    try {
        if (isRestrictedMode && permissions.hasUserGranted(conversationHistory)) isRestrictedMode = false;

        const contents = formatter.formatContents(conversationHistory, message, fileData);
        const allowedTools = formatter.getAllowedTools(isRestrictedMode, useWebSearch, allToolDefinitions, isBmsMode, isEteqMode);
        const smartUrl = useThinkingMode ? GEMINI_API_URL_THINKING : (apiKey === GEMINI_API_KEY ? GEMINI_API_URL_PREMIUM : GEMINI_API_URL);

        const requestBody = {
            contents,
            tools: allowedTools,
            tool_config: allowedTools ? {function_calling_config: {mode: "AUTO"}} : undefined,
            systemInstruction: {
                parts: [{
                    text: customSystemInstruction || (
                        isRestrictedMode && !isBmsMode && !isEteqMode
                            ? "You are a helpful AI assistant. Answer the user's questions concisely and politely in their own language."
                            : (isBmsMode ? CX_BMS_INSTRUCTION : (isEteqMode ? ETEQ_INSTRUCTION : SYSTEM_INSTRUCTION_TEXT))
                    )
                }]
            }
        };

        const response = await axios.post(`${smartUrl}?key=${apiKey}`, requestBody, {
            headers: {'Content-Type': 'application/json'},
            timeout: 60000,
            httpsAgent: keepAliveAgent
        });

        return await responseHandler.handle(response.data.candidates?.[0], message, conversationHistory, apiKey, isRestrictedMode, useWebSearch, keyIdentifier, isBmsMode, isEteqMode);
    } catch (error) {
        return errorHandler.handle(error, message, conversationHistory, apiKey, isRestrictedMode, useWebSearch, keyIdentifier, (msg, hist, key, restricted, search, id) => callGeminiAPI(msg, hist, key, restricted, search, id, isBmsMode, fileData, null, useThinkingMode, isEteqMode), isBmsMode);
    }
}

export async function callSimpleGeminiAPI(message, apiKey, keyIdentifier = null) {
    if (!apiKey) throw new Error("API Key is missing");

    try {
        const response = await axios.post(`${GEMINI_API_URL}?key=${apiKey}`, {
            contents: [{role: 'user', parts: [{text: message}]}]
        }, {
            headers: {'Content-Type': 'application/json'},
            timeout: 30000
        });

        const candidate = response.data.candidates?.[0];
        if (!candidate?.content?.parts?.[0]) throw new Error('No valid content received');
        return candidate.content.parts[0].text;
    } catch (error) {
        return errorHandler.handle(error, message, null, apiKey, null, null, keyIdentifier, callSimpleGeminiAPI);
    }
}

export default callGeminiAPI;
