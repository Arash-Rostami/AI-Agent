import axios from "axios";
import {
    CX_BMS_INSTRUCTION,
    ETEQ_INSTRUCTION,
    GEMINI_API_KEY,
    GEMINI_API_URL,
    SYSTEM_INSTRUCTION_TEXT
} from "../../config/index.js";
import {allToolDefinitions} from "../../tools/toolDefinitions.js";
import * as formatter from './formatter.js';
import * as responseHandler from './responseHandler.js';
import * as errorHandler from './errorHandler.js';
import * as permissions from './permissions.js';
import callArvanCloudAPI, {ARVAN_GEMINI_MODEL_ID, ARVAN_THINKING_MODEL_ID, callArvanCloudAPIWithTools} from '../arvancloud/index.js';

export const THINKING_MODE_ENABLED = true;

// Keep frozen at 11 params — responseHandler.js's recursive call previously overflowed this by one (fixed); see services/servicesPattern.md §3 Step 5.
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

    if (isRestrictedMode && permissions.hasUserGranted(conversationHistory)) isRestrictedMode = false;

    const contents = formatter.formatContents(conversationHistory, message, fileData);
    const allowedTools = formatter.getAllowedTools(isRestrictedMode, useWebSearch, allToolDefinitions, isBmsMode, isEteqMode);

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

    const response = await axios.post(`${GEMINI_API_URL}?key=${apiKey}`, requestBody, {
        headers: {'Content-Type': 'application/json'},
        timeout: 60000
    });

    return await responseHandler.handle(response.data.candidates?.[0], message, conversationHistory, apiKey, isRestrictedMode, useWebSearch, keyIdentifier, isBmsMode, isEteqMode);
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
        errorHandler.logError('callSimpleGeminiAPI', error);
        throw error;
    }
}

// Gemini option (UI "Gemini"): hybrid dispatch — no fallback loop.
//   thinking mode -> ArvanCloud thinking model (no tools)
//   image attach  -> native Gemini (vision; premium key required, free tier 429s today)
//   plain text    -> ArvanCloud-hosted Gemini (tool-calling capable)
export async function askGemini(
    message,
    conversationHistory = [],
    keyIdentifier = null,
    isRestrictedMode = false,
    useWebSearch = false,
    isBmsMode = false,
    fileData = null,
    customSystemInstruction = null,
    useThinkingMode = false,
    isEteqMode = false
) {
    if (useThinkingMode) {
        if (!THINKING_MODE_ENABLED) throw new Error('Thinking mode is temporarily unavailable.');
        return callArvanThinkingAPI(message, conversationHistory, customSystemInstruction);
    }

    if (fileData) {
        if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not configured');
        return callGeminiAPI(
            message, conversationHistory, GEMINI_API_KEY, isRestrictedMode, useWebSearch,
            keyIdentifier, isBmsMode, fileData, customSystemInstruction, false, isEteqMode
        );
    }

    return callArvanGemini(message, conversationHistory, customSystemInstruction, isRestrictedMode, useWebSearch, isBmsMode, isEteqMode);
}

// Gemini Smart option (UI disabled until premium key): pure native Gemini, vision + tools, no thinking.
export async function askNativeGemini(
    message,
    conversationHistory = [],
    keyIdentifier = null,
    isRestrictedMode = false,
    useWebSearch = false,
    isBmsMode = false,
    fileData = null,
    customSystemInstruction = null,
    isEteqMode = false
) {
    if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY is not configured');
    return callGeminiAPI(
        message, conversationHistory, GEMINI_API_KEY, isRestrictedMode, useWebSearch,
        keyIdentifier, isBmsMode, fileData, customSystemInstruction, false, isEteqMode
    );
}

// ArvanCloud-hosted Gemini for the Gemini option's text/tools path — no file/vision support here.
async function callArvanGemini(message, conversationHistory, customSystemInstruction, isRestrictedMode, useWebSearch, isBmsMode, isEteqMode) {
    return callArvanCloudAPIWithTools(message, conversationHistory, ARVAN_GEMINI_MODEL_ID, null, customSystemInstruction, {
        isRestrictedMode, useWebSearch, isBmsMode, isEteqMode
    });
}

// No tool-calling here — same OpenAI-style shape as callArvanGemini.
async function callArvanThinkingAPI(message, conversationHistory, customSystemInstruction) {
    const text = await callArvanCloudAPI(message, conversationHistory, ARVAN_THINKING_MODEL_ID, null, customSystemInstruction);
    return {text, sources: []};
}

export default callGeminiAPI;