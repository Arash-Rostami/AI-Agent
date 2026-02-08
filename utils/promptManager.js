import fs from 'fs';
import path from 'path';
import {
    CX_BMS_INSTRUCTION,
    ETEQ_INSTRUCTION,
    PERSOL_BS_INSTRUCTION,
    ragDirectory,
    SYSTEM_INSTRUCTION_TEXT
} from '../config/index.js';
import {searchVectors} from './vectorManager.js';

const getRagFileContent = (filename) => {
    try {
        const filePath = path.join(ragDirectory, filename);
        if (fs.existsSync(filePath)) {
            return fs.readFileSync(filePath, 'utf-8');
        }
        return null;
    } catch (error) {
        console.error(`Error reading RAG file ${filename}:`, error);
        return null;
    }
};

const determineAppContext = (req) => {
    if (req.isBmsMode) {
        return 'BMS';
    }
    if (req.isEteqMode) {
        return 'ETEQ';
    }
    if (req.isRestrictedMode) {
        return 'GENERIC'; // Other Apps (iframes) :not BMS
    }
    return 'MAIN';
};

export const constructSystemPrompt = async (req, message) => {
    const appContext = determineAppContext(req);
    let baseInstruction = '';
    let ragFile = null;

    switch (appContext) {
        case 'BMS':
            baseInstruction = CX_BMS_INSTRUCTION;
            ragFile = 'cxRag.txt';
            break;
        case 'ETEQ':
            baseInstruction = ETEQ_INSTRUCTION;
            ragFile = null;
            break;
        case 'MAIN':
            baseInstruction = PERSOL_BS_INSTRUCTION;
            ragFile = null;
            break;
        case 'GENERIC':
            baseInstruction = SYSTEM_INSTRUCTION_TEXT;
            ragFile = null;
            break;
        default:
            baseInstruction = SYSTEM_INSTRUCTION_TEXT;
    }

    if (!ragFile) return baseInstruction;

    try {
        const results = await searchVectors(message, 3, ragFile);

        if (results && results.length > 0) {
            const context = results.map(r => r.text).join('\n\n---\n\n');
            return `${baseInstruction}\n\nContext information is below.\n---------------------\n${context}\n---------------------\nGiven the context information and not prior knowledge, answer the query.`;
        } else {
            console.warn(`⚠️ Vector search yield low/no results for ${ragFile}. Switching to full-file fallback.`);
            const fullContent = getRagFileContent(ragFile);
            if (fullContent) {
                return `${baseInstruction}\n\nContext information is below.\n---------------------\n${fullContent}\n---------------------\nGiven the context information and not prior knowledge, answer the query.`;
            }
        }
    } catch (error) {
        console.error('System Prompt Construction Error:', error);
        const fullContent = getRagFileContent(ragFile);
        if (fullContent) {
            return `${baseInstruction}\n\nContext information is below.\n---------------------\n${fullContent}\n---------------------\nGiven the context information and not prior knowledge, answer the query.`;
        }
    }

    return baseInstruction;
};
