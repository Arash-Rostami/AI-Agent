import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const serveIndex = (req, res) => {
    res.sendFile(join(__dirname, '../public', 'index.html'));
};
