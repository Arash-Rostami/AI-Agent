import {sessionManager} from '../../middleware/keySession.js';
import {GEMINI_API_KEY} from '../../config/index.js';

export async function handle(error, message, conversationHistory, apiKey, isRestrictedMode, useWebSearch, keyIdentifier, retryFunction) {
    console.error(`❌ Gemini API Error (${retryFunction.name}):`, error.response?.data || error.message);

    const response = error.response;
    const status = response?.status;
    const errorMessage = response?.data?.error?.message;

    const isQuotaExceeded = status === 429;
    const isLeakedKey = status === 403 && errorMessage?.includes('Your API key was reported as leaked');

    if (isQuotaExceeded || isLeakedKey) {
        if (GEMINI_API_KEY && apiKey !== GEMINI_API_KEY) {
            console.log(`⚠️ Switching to premium key for user ${keyIdentifier || 'unknown'} (Reason: ${status})...`);

            if (keyIdentifier) sessionManager.updateKeyForIP(keyIdentifier, GEMINI_API_KEY);

            return retryFunction.name === 'callSimpleGeminiAPI'
                ? retryFunction(message, GEMINI_API_KEY, keyIdentifier)
                : retryFunction(message, conversationHistory, GEMINI_API_KEY, isRestrictedMode, useWebSearch, keyIdentifier);
        }
    }
    throw error;
}