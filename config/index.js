import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

dotenv.config();
export const PORT = process.env.PORT || 3000;
export const SITE_URL = process.env.SITE_URL || 'https://arash-ai.chbk.app/';
export const SITE_NAME = process.env.SITE_NAME || 'AI Assistant';
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY_PREMIUM;
export const GEMINI_API_URL = process.env.GEMINI_API_URL;
export const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
export const GROK_API_KEY = process.env.GROK_API_KEY;
export const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
export const OPENROUTER_API_URL = process.env.OPENROUTER_API_URL;
export const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim()) : [];


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const instructionPath = path.resolve(__dirname, '..', 'documents', 'instructions.txt');

export const SYSTEM_INSTRUCTION_TEXT = fs.readFileSync(instructionPath, 'utf-8');


if (!GEMINI_API_URL) {
    console.error('❌ Missing GEMINI_API_URL in .env file');
    process.exit(1);
}

if (!GEMINI_API_KEY) {
    console.error('❌ Missing GOOGLE_API_KEY in .env file');
    process.exit(1);
}
