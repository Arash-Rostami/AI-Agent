import callGrokAPI from './services/groq/index.js';
import callOpenRouterAPI from './services/openrouter/index.js';
import dotenv from 'dotenv';

dotenv.config();

async function testConnections() {
    console.log('🧪 Starting Connectivity Test...\n');

    // Test Groq
    try {
        console.log('Testing Groq (Qwen)...');
        const groqResponse = await callGrokAPI('Hello from test script!');
        console.log('✅ Groq Success! Response length:', groqResponse.length);
        console.log('Preview:', groqResponse.substring(0, 50) + '...\n');
    } catch (error) {
        console.error('❌ Groq Failed:', error.message);
        if (error.response?.data) console.error('Details:', JSON.stringify(error.response.data));
        console.log('\n');
    }

    // Test OpenRouter
    try {
        console.log('Testing OpenRouter (Grok)...');
        const openRouterResponse = await callOpenRouterAPI('Hello from test script!');
        console.log('✅ OpenRouter Success! Response length:', openRouterResponse.length);
        console.log('Preview:', openRouterResponse.substring(0, 50) + '...\n');
    } catch (error) {
        console.error('❌ OpenRouter Failed:', error.message);
        if (error.response?.data) console.error('Details:', JSON.stringify(error.response.data));
        console.log('\n');
    }

    console.log('🏁 Test Complete.');
    process.exit(0);
}

testConnections();
