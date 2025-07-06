import dotenv from 'dotenv';
dotenv.config();
export const PORT = process.env.PORT || 3000;
export const GEMINI_API_KEY = process.env.GOOGLE_API_KEY;
export const GEMINI_API_URL = process.env.GEMINI_API_URL;
export const WEATHER_API_KEY = process.env.WEATHER_API_KEY;



if (!GEMINI_API_URL) {
    console.error('❌ Missing GEMINI_API_URL in .env file');
    process.exit(1);
}

if (!GEMINI_API_KEY) {
    console.error('❌ Missing GOOGLE_API_KEY in .env file');
    process.exit(1);
}
