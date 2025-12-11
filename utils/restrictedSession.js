import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');
const FILE_PATH = path.join(DATA_DIR, 'restricted_ips.json');
const EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadData() {
    try {
        if (!fs.existsSync(FILE_PATH)) return {};
        const data = fs.readFileSync(FILE_PATH, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading restricted_ips.json:', error);
        return {};
    }
}

function saveData(data) {
    try {
        fs.writeFileSync(FILE_PATH, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error writing restricted_ips.json:', error);
    }
}

export const saveRestrictedIP = (ip, isBms = false) => {
    if (!ip) return;
    const data = loadData();
    data[ip] = {
        timestamp: Date.now(),
        isBms: isBms
    };
    saveData(data);
};

export const isRestrictedIP = (ip) => {
    if (!ip) return { isRestricted: false, isBms: false };

    const data = loadData();
    const entry = data[ip];

    if (!entry) return { isRestricted: false, isBms: false };

    // Check expiry
    if (Date.now() - entry.timestamp > EXPIRY_MS) {
        delete data[ip]; // Cleanup expired
        saveData(data);
        return { isRestricted: false, isBms: false };
    }

    return { isRestricted: true, isBms: entry.isBms || false };
};
