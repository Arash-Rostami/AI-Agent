import {sessionManager} from '../../middleware/keySession.js';

export async function handle(error, message, conversationHistory, apiKey, isRestrictedMode, useWebSearch, keyIdentifier, retryFunction) {
    console.error(`❌ Gemini API Error (${retryFunction.name}):`, error.response?.data || error.message);

    if (error.response?.status === 429) {
        const premiumKey = process.env.GEMINI_API_KEY_PREMIUM;
        if (premiumKey && apiKey !== premiumKey) {
            console.log(`⚠️ Quota exceeded. Retrying with GEMINI_API_KEY_PREMIUM for user ${keyIdentifier || 'unknown'}...`);

            if (keyIdentifier) sessionManager.updateKeyForIP(keyIdentifier, premiumKey);

            return retryFunction.name === 'callSimpleGeminiAPI'
                ? retryFunction(message, premiumKey, keyIdentifier)
                : retryFunction(message, conversationHistory, premiumKey, isRestrictedMode, useWebSearch, keyIdentifier);
        }
    }
    throw error;
}