import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORAGE_FILE = path.resolve(__dirname, '../data/sessions.json');
const SESSION_DURATION = 2 * 60 * 60 * 1000; // 2 Hours Session Length

if (!fs.existsSync(path.dirname(STORAGE_FILE))) {
    fs.mkdirSync(path.dirname(STORAGE_FILE), {recursive: true});
}

export class KeySessionManager {
    constructor(keys) {
        this.keys = keys.filter(Boolean);
    }

    _load() {
        try {
            if (!fs.existsSync(STORAGE_FILE)) return {};
            return JSON.parse(fs.readFileSync(STORAGE_FILE, 'utf-8'));
        } catch {
            return {};
        }
    }

    _save(data) {
        fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2));
    }

    getKeyForIP(ip) {
        // Fallback if IP is missing
        if (!ip) return this.keys[0];

        const sessions = this._load();
        const now = Date.now();
        const userSession = sessions[ip];

        // 1. If session exists and is fresh (< 2 hours), return saved key
        if (userSession && (now - userSession.timestamp < SESSION_DURATION)) return userSession.key;


        // 2. Otherwise, assign a NEW random key
        const newKey = this.keys[Math.floor(Math.random() * this.keys.length)];

        sessions[ip] = {
            key: newKey,
            timestamp: now
        };

        Object.keys(sessions).forEach(storedIp => {
            if (now - sessions[storedIp].timestamp > SESSION_DURATION) {
                delete sessions[storedIp];
            }
        });

        this._save(sessions);
        return newKey;
    }

    updateKeyForIP(ip, newKey) {
        if (!ip || !newKey) return;

        const sessions = this._load();
        sessions[ip] = {
            key: newKey,
            timestamp: Date.now()
        };
        this._save(sessions);
    }
}
