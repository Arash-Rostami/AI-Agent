import callGrokAPI from './services/groq/index.js';
import callOpenRouterAPI from './services/openrouter/index.js';
import callArvanCloudAPI from './services/arvancloud/index.js';
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

    // Test ArvanCloud GPT-4o
    try {
        console.log('Testing ArvanCloud (GPT-4o)...');
        const arvanResponse = await callArvanCloudAPI('Hello from test script!', [], 'GPT-4o-mini-4193n');
        console.log('✅ ArvanCloud GPT-4o Success! Response length:', arvanResponse.length);
        console.log('Preview:', arvanResponse.substring(0, 50) + '...\n');
    } catch (error) {
        console.error('❌ ArvanCloud GPT-4o Failed:', error.message);
        console.log('\n');
    }

    // Test ArvanCloud DeepSeek
    try {
        console.log('Testing ArvanCloud (DeepSeek)...');
        const arvanDeepSeekResponse = await callArvanCloudAPI('Hello from test script!', [], 'DeepSeek-Chat-V3-0324-mbxyd');
        console.log('✅ ArvanCloud DeepSeek Success! Response length:', arvanDeepSeekResponse.length);
        console.log('Preview:', arvanDeepSeekResponse.substring(0, 50) + '...\n');
    } catch (error) {
        console.error('❌ ArvanCloud DeepSeek Failed:', error.message);
        console.log('\n');
    }

    console.log('🏁 Test Complete.');
    process.exit(0);
}

testConnections();
