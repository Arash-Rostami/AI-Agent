import dotenv from 'dotenv';

dotenv.config();
export const PORT = process.env.PORT || 3000;
export const SITE_URL = process.env.SITE_URL || 'https://arash-ai.chbk.app/';
export const SITE_NAME = process.env.SITE_NAME || 'AI Assistant';
export const GEMINI_API_KEY = process.env.GOOGLE_API_KEY;
export const GEMINI_API_URL = process.env.GEMINI_API_URL;
export const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
export const GROK_API_KEY = process.env.GROK_API_KEY;
export const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
export const OPENROUTER_API_URL = process.env.OPENROUTER_API_URL;
export const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim()) : [];


if (!GEMINI_API_URL) {
    console.error('❌ Missing GEMINI_API_URL in .env file');
    process.exit(1);
}

if (!GEMINI_API_KEY) {
    console.error('❌ Missing GOOGLE_API_KEY in .env file');
    process.exit(1);
}
