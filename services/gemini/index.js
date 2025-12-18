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

        const requestBody = {
            contents,
            tools: allowedTools,
            tool_config: allowedTools ? {function_calling_config: {mode: "AUTO"}} : undefined,
            systemInstruction: {
                parts: [{
                    text: isRestrictedMode && !useWebSearch && !isBmsMode
                        ? "You are a helpful AI assistant. Answer the user's questions concisely and politely in their own language."
                        : (isBmsMode ? CX_BMS_INSTRUCTION : SYSTEM_INSTRUCTION_TEXT)
                }]
            }
        };

        let requestUrl = `${GEMINI_API_URL}?key=${apiKey}`;
        const isPremium = apiKey === process.env.GEMINI_API_KEY_PREMIUM;
        const hasAudioInput = fileData && fileData.mimeType && fileData.mimeType.startsWith('audio/');

        if (isPremium && hasAudioInput) {
            const ttsModel = process.env.GEMINI_TTS_MODEL || "gemini-2.0-flash-exp";
            requestUrl = `https://generativelanguage.googleapis.com/v1alpha/models/${ttsModel}:generateContent?key=${apiKey}`;
            requestBody.generationConfig = {
                responseModalities: ["TEXT", "AUDIO"],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: {
                            voiceName: "Puck"
                        }
                    }
                }
            };
        }

        const response = await axios.post(requestUrl, requestBody, {
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