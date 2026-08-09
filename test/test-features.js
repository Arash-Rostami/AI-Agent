import {askGemini, callGeminiAPI} from '../services/gemini/index.js';
import callArvanCloudAPI, {ARVAN_THINKING_MODEL_ID} from '../services/arvancloud/index.js';
import {createTransport} from 'nodemailer';
import {SMTP_HOST, SMTP_PASS, SMTP_PORT, SMTP_USER} from '../config/index.js';
import dotenv from 'dotenv';

dotenv.config();

async function testFeatures() {
    console.log('🧪 Starting Comprehensive Feature Test...\n');

    // 1. Test Web Search (Gemini, via the free-tier fallback cascade)
    try {
        console.log('🔍 Testing Web Search (Gemini)...');
        const searchResponse = await askGemini(
            'What is the current stock price of Apple (AAPL)?',
            [],
            'test-user',
            false, // isRestrictedMode
            true   // useWebSearch
        );
        console.log('✅ Web Search Success!');
        console.log('Preview:', searchResponse.text.substring(0, 100) + '...\n');
        if (searchResponse.sources && searchResponse.sources.length > 0) {
            console.log('   Sources found:', searchResponse.sources.length);
        } else {
            console.warn('   ⚠️ No sources returned (Check if Google Search tool is enabled/working).');
        }
    } catch (error) {
        console.error('❌ Web Search Failed:', error.message);
        console.log('\n');
    }

    // 2. Test Image Understanding (native Gemini multimodal — ArvanCloud has no vision-capable model anymore)
    try {
        console.log('🖼️  Testing Image Understanding (Gemini)...');
        const base64Image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

        const imageResponse = await callGeminiAPI(
            'What color is this image? (It should be transparent/empty)',
            [],
            process.env.GEMINI_API_KEY,
            false, false, 'test-user', false,
            {mimeType: 'image/png', data: base64Image}
        );
        console.log('✅ Image Analysis Success!');
        console.log('Response:', imageResponse.text + '\n');
    } catch (error) {
        console.error('❌ Image Analysis Failed:', error.message);
        console.log('\n');
    }

    // 3. Test Email Configuration
    try {
        console.log('📧 Testing Email Configuration (SMTP Connection)...');
        if (!SMTP_HOST) {
            console.log('   ⚠️ SMTP_HOST not set in env. Skipping email test.');
        } else {
            const transporter = createTransport({
                host: SMTP_HOST,
                port: SMTP_PORT,
                secure: SMTP_PORT == 465, // true for 465, false for other ports
                auth: {
                    user: SMTP_USER,
                    pass: SMTP_PASS,
                },
            });

            await transporter.verify();
            console.log('✅ SMTP Connection Verified!');
        }
    } catch (error) {
        console.error('❌ SMTP Connection Failed:', error.message);
    }
    console.log('\n');

    // 4. Test Thinking Mode (calls the ArvanCloud Thinking model directly — bypasses
    // THINKING_MODE_ENABLED on purpose, to verify the underlying endpoint/key still work)
    try {
        console.log('🧠 Testing Thinking Mode (ArvanCloud Gemini-3-Flash-Preview)...');
        const thinkResponse = await callArvanCloudAPI(
            'How many Rs are in Strawberry?',
            [],
            ARVAN_THINKING_MODEL_ID
        );
        console.log('✅ Thinking Mode Success!');
        console.log('Response:', thinkResponse.substring(0, 100) + '...\n');
    } catch (error) {
        console.error('❌ Thinking Mode Failed:', error.message);
        console.log('\n');
    }

    console.log('🏁 Feature Test Complete.');
    process.exit(0);
}

testFeatures();
