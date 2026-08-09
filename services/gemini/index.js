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
import {sessionManager} from '../../utils/sessionManager.js';
import callArvanCloudAPI, {ARVAN_GEMINI_MODEL_ID, ARVAN_THINKING_MODEL_ID, callArvanCloudAPIWithTools} from '../arvancloud/index.js';

export const THINKING_MODE_ENABLED = true;

// GEMINI_API_KEY_ALT removed from rotation — persistent 403, not transient.
const PROVIDER_ORDER = ['primary', 'arvan'];
const PROVIDER_KEYS = {primary: GEMINI_API_KEY};
// Primary just needs to fail fast so discovery doesn't stall the user. Arvan is the last hop —
// nothing left to fall back to — and its tool-calling round trip (e.g. sendEmail's real SMTP
// send) can legitimately take longer than 10s, so it gets a bigger budget instead of a guaranteed
// timeout failure for an operation that may have actually succeeded.
const PRIMARY_TIMEOUT_MS = 10000;
const ARVAN_TIMEOUT_MS = 30000;
const PRIMARY_DOWN_COOLDOWN_MS = 15 * 60 * 1000;

function rotateToStart(order, startSlot) {
    const idx = order.indexOf(startSlot);
    return idx <= 0 ? order : [...order.slice(idx), ...order.slice(0, idx)];
}

function isSlotConfigured(slot) {
    if (slot === 'primary') return Boolean(GEMINI_API_KEY) && !sessionManager.isPrimaryDown();
    return true;
}

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

function withTimeout(promise, ms, label) {
    let timer;
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => {
            const error = new Error(`${label} timed out after ${ms}ms`);
            error.code = 'ECONNABORTED';
            reject(error);
        }, ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
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

    const order = rotateToStart(PROVIDER_ORDER, sessionManager.getProviderSlot(keyIdentifier)).filter(isSlotConfigured);
    let lastError = null;

    for (const slot of order) {
        try {
            const attempt = slot === 'arvan'
                ? callArvanGeminiFallback(message, conversationHistory, customSystemInstruction, isRestrictedMode, useWebSearch, isBmsMode, isEteqMode)
                : callGeminiAPI(
                    message, conversationHistory, PROVIDER_KEYS[slot], isRestrictedMode, useWebSearch,
                    keyIdentifier, isBmsMode, fileData, customSystemInstruction, false, isEteqMode
                );

            const timeoutMs = slot === 'primary' ? PRIMARY_TIMEOUT_MS : ARVAN_TIMEOUT_MS;
            const result = await withTimeout(attempt, timeoutMs, `Gemini (${slot})`);
            sessionManager.setProviderSlot(keyIdentifier, slot);
            return result;
        } catch (error) {
            errorHandler.logError(`askGemini:${slot}`, error);
            const {failoverEligible, isDailyQuotaExceeded} = errorHandler.classify(error);
            if (slot === 'primary' && isDailyQuotaExceeded) sessionManager.markPrimaryDown(PRIMARY_DOWN_COOLDOWN_MS);
            if (!failoverEligible) throw error;
            lastError = error;
            console.warn(`⚠️ Gemini provider "${slot}" not working for ${keyIdentifier || 'unknown'} — trying next fallback...`);
        }
    }

    throw lastError;
}

// Tool-calling-capable, no file/vision support on this hop.
async function callArvanGeminiFallback(message, conversationHistory, customSystemInstruction, isRestrictedMode, useWebSearch, isBmsMode, isEteqMode) {
    return callArvanCloudAPIWithTools(message, conversationHistory, ARVAN_GEMINI_MODEL_ID, null, customSystemInstruction, {
        isRestrictedMode, useWebSearch, isBmsMode, isEteqMode, timeoutMs: ARVAN_TIMEOUT_MS
    });
}

// No tool-calling or fallback cascade here either — same OpenAI-style shape as callArvanGeminiFallback.
async function callArvanThinkingAPI(message, conversationHistory, customSystemInstruction) {
    const text = await callArvanCloudAPI(message, conversationHistory, ARVAN_THINKING_MODEL_ID, null, customSystemInstruction);
    return {text, sources: []};
}

export default callGeminiAPI;
