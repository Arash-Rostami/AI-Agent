import axios from "axios";
import {CX_BMS_INSTRUCTION, GEMINI_API_URL, SYSTEM_INSTRUCTION_TEXT} from "../../config/index.js";
import {allToolDefinitions} from "../../tools/toolDefinitions.js";
import * as formatter from './formatter.js';
import * as responseHandler from './responseHandler.js';
import * as errorHandler from './errorHandler.js';
import * as permissions from './permissions.js';

export async function callGeminiAPI(
    message,
    conversationHistory = [],
    apiKey,
    isRestrictedMode = false,
    useWebSearch = false,
    keyIdentifier = null,
    isBmsMode = false,
    fileData = null
) {
    if (!apiKey) throw new Error("API Key is missing in callGeminiAPI");

    try {
        if (isRestrictedMode && permissions.hasUserGranted(conversationHistory)) isRestrictedMode = false;

        const contents = formatter.formatContents(conversationHistory, message, fileData);
        const allowedTools = formatter.getAllowedTools(isRestrictedMode, useWebSearch, allToolDefinitions, isBmsMode);

        const isAudioInput = fileData && fileData.mimeType.startsWith('audio/');

        const requestBody = {
            contents,
            tools: allowedTools,
            tool_config: allowedTools ? {function_calling_config: {mode: "AUTO"}} : undefined,
            generationConfig: isAudioInput ? { responseModalities: ["TEXT", "AUDIO"] } : undefined,
            systemInstruction: {
                parts: [{
                    text: isRestrictedMode && !useWebSearch && !isBmsMode
                        ? "You are a helpful AI assistant. Answer the user's questions concisely and politely in their own language."
                        : (isBmsMode ? CX_BMS_INSTRUCTION : SYSTEM_INSTRUCTION_TEXT)
                }]
            }
        };

        let requestUrl = GEMINI_API_URL;

        // If audio input is detected, enforce a model version known to support audio output (gemini-1.5-flash-002)
        // This regex looks for "/models/ANY_MODEL_NAME:" and replaces it with "/models/gemini-1.5-flash-002:"
        if (isAudioInput && requestUrl.includes('google')) {
             const newUrl = requestUrl.replace(/\/models\/[^:]+:/, '/models/gemini-1.5-flash-002:');
             if (newUrl !== requestUrl) {
                 console.log(`🎙️ Switching model for audio output: ${requestUrl} -> ${newUrl}`);
                 requestUrl = newUrl;
             }
        }

        const response = await axios.post(`${requestUrl}?key=${apiKey}`, requestBody, {
            headers: {'Content-Type': 'application/json'},
            timeout: 60000
        });

        return await responseHandler.handle(response.data.candidates?.[0], message, conversationHistory, apiKey, isRestrictedMode, useWebSearch, keyIdentifier, isBmsMode);
    } catch (error) {
        return errorHandler.handle(error, message, conversationHistory, apiKey, isRestrictedMode, useWebSearch, keyIdentifier, (msg, hist, key, restricted, search, id, bms) => callGeminiAPI(msg, hist, key, restricted, search, id, bms, fileData), isBmsMode);
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