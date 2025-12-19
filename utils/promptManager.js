import fs from 'fs';
import path from 'path';
import {
    CX_BMS_INSTRUCTION,
    PERSOL_BS_INSTRUCTION,
    SYSTEM_INSTRUCTION_TEXT,
    ragDirectory
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

export const determineAppContext = (req) => {
    if (req.isBmsMode) {
        return 'BMS';
    }
    if (req.isRestrictedMode) {
        return 'GENERIC'; // Restricted but not BMS
    }
    return 'MAIN'; // Not restricted
};

export const constructSystemPrompt = async (req, message) => {
    const appContext = determineAppContext(req);
    let baseInstruction = '';
    let ragFile = null;

    // 1. Select Base Instruction & RAG File
    switch (appContext) {
        case 'BMS':
            baseInstruction = CX_BMS_INSTRUCTION;
            ragFile = 'cxRag.txt';
            break;
        case 'MAIN':
            baseInstruction = PERSOL_BS_INSTRUCTION;
            // Future: Check for 'persolRag.txt' if needed. For now, strictly no RAG.
            ragFile = null;
            break;
        case 'GENERIC':
            baseInstruction = SYSTEM_INSTRUCTION_TEXT;
            ragFile = null;
            break;
        default:
            baseInstruction = SYSTEM_INSTRUCTION_TEXT;
    }

    // 2. If no RAG file is applicable, return base instruction
    if (!ragFile) {
        return baseInstruction;
    }

    // 3. Attempt RAG Vector Search
    try {
        const results = await searchVectors(message, 3, ragFile);

        if (results && results.length > 0) {
            // High confidence matches found
            const context = results.map(r => r.text).join('\n\n---\n\n');
            return `${baseInstruction}\n\nContext information is below.\n---------------------\n${context}\n---------------------\nGiven the context information and not prior knowledge, answer the query.`;
        } else {
            // 4. Fallback: Load full RAG file
            console.warn(`⚠️ Vector search yield low/no results for ${ragFile}. Switching to full-file fallback.`);
            const fullContent = getRagFileContent(ragFile);
            if (fullContent) {
                return `${baseInstruction}\n\nContext information is below.\n---------------------\n${fullContent}\n---------------------\nGiven the context information and not prior knowledge, answer the query.`;
            }
        }
    } catch (error) {
        console.error('System Prompt Construction Error:', error);
        // Fallback on error
        const fullContent = getRagFileContent(ragFile);
        if (fullContent) {
            return `${baseInstruction}\n\nContext information is below.\n---------------------\n${fullContent}\n---------------------\nGiven the context information and not prior knowledge, answer the query.`;
        }
    }

    return baseInstruction;
};
