import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const PORT = process.env.PORT || 3000;
export const SITE_URL = process.env.SITE_URL || 'https://arash-ai.chbk.app/';
export const BMS_API_URL = process.env.BMS_API_URL;
export const SITE_NAME = process.env.SITE_NAME || 'AI Assistant';
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const GEMINI_API_URL = process.env.GEMINI_API_URL;
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY_PREMIUM;
export const GEMINI_API_URL_PREMIUM = process.env.GEMINI_API_URL_PREMIUM;
export const WEATHER_API_KEY = process.env.WEATHER_API_KEY;
export const GROK_API_KEY = process.env.GROK_API_KEY;
export const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
export const OPENROUTER_API_URL = process.env.OPENROUTER_API_URL;
export const ARVANCLOUD_API_KEY = process.env.ARVANCLOUD_API_KEY;
export const ARVANCLOUD_CHATGPT_URL = process.env.ARVANCLOUD_CHATGPT_URL;
export const ARVANCLOUD_DEEPSEEK_URL = process.env.ARVANCLOUD_DEEPSEEK_URL;
export const ARVANCLOUD_EMBEDDING_URL = process.env.ARVANCLOUD_EMBEDDING_URL;
export const AI_SERVICE_SECRET = process.env.AI_SERVICE_SECRET;
export const MONGO_URI = process.env.MONGO_URI;
export const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_key_change_me';

export const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim()) : [];

export const SYSTEM_INSTRUCTION_TEXT = fs.readFileSync(
    path.resolve(__dirname, '..', 'documents', 'instructions.txt'), 'utf-8'
);
export const CX_BMS_INSTRUCTION = fs.readFileSync(
    path.resolve(__dirname, '..', 'documents', 'cxbms.txt'), 'utf-8'
);
export const PERSOL_BS_INSTRUCTION = fs.readFileSync(
    path.resolve(__dirname, '..', 'documents', 'persolbs.txt'), 'utf-8'
);
export const ragDirectory = path.resolve(__dirname, '../documents/RAG');

if (!GEMINI_API_URL) {
    console.error('❌ Missing GEMINI_API_URL in .env file');
    process.exit(1);
}

if (!GEMINI_API_KEY) {
    console.error('❌ Missing GOOGLE_API_KEY in .env file');
    process.exit(1);
}