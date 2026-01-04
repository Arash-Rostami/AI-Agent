import fs from 'fs';

async function runTest() {
    console.log('🧪 Starting Email Tool Logic Verification...');

    const fileContent = fs.readFileSync('./services/emailTool.js', 'utf-8');

    // Check for userTime usage
    if (!fileContent.includes('const timestamp = userTime || new Date().toLocaleString')) {
        console.error('❌ FAILURE: Logic for userTime fallback not found in code!');
        process.exit(1);
    } else {
        console.log('✅ Logic check: userTime fallback exists.');
    }

    // Check for Header construction
    if (!fileContent.includes('const headerText = `Chat Transcript - Sent: ${timestamp}')) {
        console.error('❌ FAILURE: Header text construction incorrect!');
         process.exit(1);
    } else {
         console.log('✅ Logic check: Header text uses timestamp.');
    }

    // Check Email Definition
    const defContent = fs.readFileSync('./tools/email/emailDefinition.js', 'utf-8');
    if (!defContent.includes('userTime: {')) {
         console.error('❌ FAILURE: userTime parameter missing from tool definition!');
         process.exit(1);
    } else {
         console.log('✅ Definition check: userTime parameter exists.');
    }

    console.log('🎉 Static analysis verification passed.');
}

runTest();
