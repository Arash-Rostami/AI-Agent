import { callGeminiAPI } from './services/gemini/index.js';
import callArvanCloudAPI from './services/arvancloud/index.js';
import { createTransport } from 'nodemailer';
import { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } from './config/index.js';
import dotenv from 'dotenv';

dotenv.config();

async function testFeatures() {
    console.log('🧪 Starting Comprehensive Feature Test...\n');

    // 1. Test Web Search (Gemini)
    try {
        console.log('🔍 Testing Web Search (Gemini)...');
        // Note: useWebSearch = true
        const searchResponse = await callGeminiAPI(
            'What is the current stock price of Apple (AAPL)?',
            [],
            process.env.GEMINI_API_KEY_PREMIUM,
            false, // isRestrictedMode
            true,  // useWebSearch
            'test-user'
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

    // 2. Test Image Understanding (Multimodal)
    try {
        console.log('🖼️  Testing Image Understanding (Arvan Cloud GPT-4o)...');
        // 1x1 Transparent PNG Base64
        const base64Image = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

        const imageResponse = await callArvanCloudAPI(
            'What color is this image? (It should be transparent/empty)',
            [],
            'GPT-4o-mini-4193n',
            base64Image
        );
        console.log('✅ Image Analysis Success!');
        console.log('Response:', imageResponse + '\n');
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

    // 4. Test Thinking Mode (Gemini)
    try {
        console.log('wc  Testing Thinking Mode (Gemini)...');
        // useThinkingMode = true
        // Note: This might take longer
        const thinkResponse = await callGeminiAPI(
            'How many Rs are in Strawberry?',
            [],
            process.env.GEMINI_API_KEY_PREMIUM,
            false,
            false,
            'test-user',
            false, // isBmsMode
            null, // fileData
            null, // systemInstruction
            true // useThinkingMode
        );
        console.log('✅ Thinking Mode Success!');
        console.log('Response:', thinkResponse.text.substring(0, 100) + '...\n');
    } catch (error) {
        console.error('❌ Thinking Mode Failed:', error.message);
        console.log('\n');
    }

    console.log('🏁 Feature Test Complete.');
    process.exit(0);
}

testFeatures();
