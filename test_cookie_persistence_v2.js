
// We need to set env vars BEFORE importing the config/middleware
process.env.ALLOWED_ORIGINS = "https://allowed.com,https://export.communitasker.io";
process.env.GEMINI_API_URL = "mock";
process.env.GEMINI_API_KEY_PREMIUM = "mock";

// Dynamic import to ensure env vars are picked up
const { checkRestrictedMode } = await import('./middleware/restrictedMode.js');
import express from 'express';
import request from 'supertest';
import cookieParser from 'cookie-parser';

const app = express();
app.use(cookieParser());
app.use(checkRestrictedMode);

app.get('/initial-prompt', (req, res) => {
    res.json({
        isRestrictedMode: req.isRestrictedMode,
        isBmsMode: req.isBmsMode
    });
});

async function runTest() {
    console.log('--- Starting Test: Cookie Persistence (Retry) ---');

    // Test 1: First request WITH Referer -> Should set Cookie
    console.log('\nTest 1: Initial Request (With Referer)');
    const res1 = await request(app)
        .get('/initial-prompt')
        .set('Referer', 'https://allowed.com/some/page');

    const cookies = res1.headers['set-cookie'];
    console.log('Response 1 Cookies:', cookies);

    const hasRestrictedCookie = cookies && cookies.some(c => c.includes('restricted_mode=true'));

    if (hasRestrictedCookie) {
        console.log('✅ PASS: Cookie set on valid Referer.');
    } else {
        console.log('❌ FAIL: Cookie NOT set.');
    }
}

runTest();
