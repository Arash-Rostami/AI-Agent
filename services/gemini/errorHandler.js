export function logError(context, error) {
    console.error(`❌ Gemini API Error (${context}):`, error.response?.data || error.message);
}