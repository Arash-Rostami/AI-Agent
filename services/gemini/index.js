import axios from "axios";
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {GEMINI_API_URL, SYSTEM_INSTRUCTION_TEXT} from "../../config/index.js";
import {allToolDefinitions} from "../../tools/toolDefinitions.js";
import * as formatter from './formatter.js';
import * as responseHandler from './responseHandler.js';
import * as errorHandler from './errorHandler.js';
import * as permissions from './permissions.js';

const PERSOL_BS_INSTRUCTION = fs.readFileSync(
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'documents', 'persolbs.txt'), 'utf-8'
);

export async function callGeminiAPI(message, conversationHistory = [], apiKey, isRestrictedMode = false, useWebSearch = false, keyIdentifier = null, isBmsMode = false) {
    if (!apiKey) throw new Error("API Key is missing in callGeminiAPI");

    try {
        if (isRestrictedMode && permissions.hasUserGranted(conversationHistory)) isRestrictedMode = false;

        const contents = formatter.formatContents(conversationHistory, message);
        const allowedTools = formatter.getAllowedTools(isRestrictedMode, useWebSearch, allToolDefinitions, isBmsMode);

        let systemInstructionText = SYSTEM_INSTRUCTION_TEXT;
        if (isBmsMode) {
            systemInstructionText += "\n\n" + PERSOL_BS_INSTRUCTION;
        }

        const requestBody = {
            contents,
            tools: allowedTools,
            tool_config: allowedTools ? {function_calling_config: {mode: "AUTO"}} : undefined,
            systemInstruction: {
                parts: [{
                    text: isRestrictedMode && !useWebSearch && !isBmsMode
                        ? "You are a helpful AI assistant. Answer the user's questions concisely and politely in their own language."
                        : systemInstructionText
                }]
            }
        };

        const response = await axios.post(`${GEMINI_API_URL}?key=${apiKey}`, requestBody, {
            headers: {'Content-Type': 'application/json'},
            timeout: 60000
        });

        return await responseHandler.handle(response.data.candidates?.[0], message, conversationHistory, apiKey, isRestrictedMode, useWebSearch, keyIdentifier);
    } catch (error) {
        return errorHandler.handle(error, message, conversationHistory, apiKey, isRestrictedMode, useWebSearch, keyIdentifier, callGeminiAPI);
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