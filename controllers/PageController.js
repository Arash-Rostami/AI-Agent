import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const serveIndex = (req, res) => {
    if (req.isRestrictedMode) {
        res.cookie('restricted_ui', 'true', {maxAge: 86400 * 1000});
    } else {
        res.clearCookie('restricted_ui');
    }
    res.sendFile(join(__dirname, '../public', 'index.html'));
};
