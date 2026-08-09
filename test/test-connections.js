import callGrokAPI from '../services/groq/index.js';
import callArvanCloudAPI, {ARVAN_CHATGPT_MODEL_ID, ARVAN_GEMINI_MODEL_ID} from '../services/arvancloud/index.js';
import {askGemini} from '../services/gemini/index.js';
import dotenv from 'dotenv';

dotenv.config();

async function testConnections() {
    console.log('🧪 Starting Connectivity Test...\n');

    // Test Groq
    try {
        console.log('Testing Groq (Llama 3.1 8B Instant)...');
        const groqResponse = await callGrokAPI('Hello from test script!');
        console.log('✅ Groq Success! Response length:', groqResponse.length);
        console.log('Preview:', groqResponse.substring(0, 50) + '...\n');
    } catch (error) {
        console.error('❌ Groq Failed:', error.message);
        if (error.response?.data) console.error('Details:', JSON.stringify(error.response.data));
        console.log('\n');
    }

    // Test ArvanCloud ChatGPT (GPT-OSS-120B)
    try {
        console.log('Testing ArvanCloud (ChatGPT / GPT-OSS-120B)...');
        const arvanResponse = await callArvanCloudAPI('Hello from test script!', [], ARVAN_CHATGPT_MODEL_ID);
        console.log('✅ ArvanCloud ChatGPT Success! Response length:', arvanResponse.length);
        console.log('Preview:', arvanResponse.substring(0, 50) + '...\n');
    } catch (error) {
        console.error('❌ ArvanCloud ChatGPT Failed:', error.message);
        console.log('\n');
    }

    // Test ArvanCloud Gemini fallback model directly
    try {
        console.log('Testing ArvanCloud (Gemini fallback)...');
        const arvanGeminiResponse = await callArvanCloudAPI('Hello from test script!', [], ARVAN_GEMINI_MODEL_ID);
        console.log('✅ ArvanCloud Gemini fallback Success! Response length:', arvanGeminiResponse.length);
        console.log('Preview:', arvanGeminiResponse.substring(0, 50) + '...\n');
    } catch (error) {
        console.error('❌ ArvanCloud Gemini fallback Failed:', error.message);
        console.log('\n');
    }

    // Test the full Gemini cascade (primary key -> alt key -> ArvanCloud Gemini)
    try {
        console.log('Testing Gemini fallback cascade (askGemini)...');
        const {text} = await askGemini('Hello from test script!', [], 'test-script');
        console.log('✅ askGemini Success! Response length:', text.length);
        console.log('Preview:', text.substring(0, 50) + '...\n');
    } catch (error) {
        console.error('❌ askGemini Failed (all providers down?):', error.message);
        console.log('\n');
    }

    console.log('🏁 Test Complete.');
    process.exit(0);
}

testConnections();
