import express from 'express';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function configureStaticResources(app) {
    // Serve public directory
    app.use(express.static('public'));

    // Serve html2pdf directory from node_modules
    // Mounts 'node_modules/html2pdf.js/dist' at '/assets/js/lib'
    // So '/assets/js/lib/html2pdf.bundle.min.js' maps to '.../dist/html2pdf.bundle.min.js'
    app.use('/assets/js/lib',
        express.static(join(__dirname, '..', 'node_modules/html2pdf.js/dist'))
    );
}
