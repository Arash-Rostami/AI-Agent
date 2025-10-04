import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DOCUMENT_PATH = path.resolve(__dirname, '..', 'documents', 'persolbs.txt');

export async function getBusinessInfo() {
    try {
        const content = fs.readFileSync(DOCUMENT_PATH, 'utf-8');
        return {content: content};
    } catch (error) {
        console.error('❌ Error reading business document:', error.message);
        throw new Error('Failed to read the business information document.');
    }
}