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

// Per-identity sticky provider slot ('primary' | 'alt' | 'arvan'), TTL-expiring back to default.
export const DEFAULT_PROVIDER_SLOT = 'primary';

export class KeySessionManager {
    primaryDownUntil = 0;

    isPrimaryDown() {
        return Date.now() < this.primaryDownUntil;
    }

    markPrimaryDown(cooldownMs) {
        this.primaryDownUntil = Date.now() + cooldownMs;
    }

    clearPrimaryDown() {
        this.primaryDownUntil = 0;
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

    getProviderSlot(identifier) {
        if (!identifier) return DEFAULT_PROVIDER_SLOT;

        const sessions = this._load();
        const entry = sessions[identifier];

        if (entry && (Date.now() - entry.timestamp < SESSION_DURATION)) return entry.slot;
        return DEFAULT_PROVIDER_SLOT;
    }

    setProviderSlot(identifier, slot) {
        if (!identifier || !slot) return;

        const sessions = this._load();
        const now = Date.now();
        sessions[identifier] = {slot, timestamp: now};

        Object.keys(sessions).forEach(id => {
            if (now - sessions[id].timestamp > SESSION_DURATION) delete sessions[id];
        });

        this._save(sessions);
    }
}

export const sessionManager = new KeySessionManager();