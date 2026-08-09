// Classifies only — services/gemini/index.js's askGemini decides whether/how to retry.
export function classify(error) {
    const response = error.response;
    const status = response?.status;
    const errorMessage = response?.data?.error?.message;
    const errorDetails = response?.data?.error?.details;

    const isTimeout = error.code === 'ECONNABORTED' || /timeout/i.test(error.message || '');
    const isQuotaExceeded = status === 429;
    const isLeakedKey = status === 403 && errorMessage?.includes('Your API key was reported as leaked');
    const isDailyQuotaExceeded = isQuotaExceeded && (
        errorMessage?.includes('PerDay') ||
        errorDetails?.some(d => d.violations?.some(v => v.quotaId?.includes('PerDay')))
    );

    return {
        status,
        isTimeout,
        isQuotaExceeded,
        isLeakedKey,
        isDailyQuotaExceeded,
        failoverEligible: isTimeout || isQuotaExceeded || isLeakedKey
    };
}

export function logError(context, error) {
    console.error(`❌ Gemini API Error (${context}):`, error.response?.data || error.message);
}