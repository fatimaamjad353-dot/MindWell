// test-complete.js
const aiService = require('./src/services/ai.service');

async function testComplete() {
    console.log('\n' + '='.repeat(60));
    console.log('🧪 TESTING COMPLETE SYSTEM (FAQ + Diagnosis + Recommender)');
    console.log('='.repeat(60) + '\n');

    // ─── Test 1: FAQ Question ──────────────────────
    console.log('📝 Test 1: FAQ Question');
    console.log('Input: "What is anxiety?"');
    const result1 = await aiService.processAIMessage('What is anxiety?', 'TestUser', []);
    console.log('✅ Response:', result1.aiResponse.substring(0, 100) + '...');
    console.log('   Used FAQ:', result1.usedFAQ);
    console.log('');

    // ─── Test 2: Diagnosis + Recommender ────────────
    console.log('📝 Test 2: Diagnosis + Recommender');
    console.log('Input: "I feel really anxious and stressed about everything"');
    const result2 = await aiService.processAIMessage(
        'I feel really anxious and stressed about everything',
        'TestUser',
        []
    );
    console.log('✅ Diagnosis:', result2.diagnosis);
    console.log('   Confidence:', result2.confidence + '%');
    console.log('   Severity:', result2.severity + '/10');
    console.log('   Risk Level:', result2.riskLevel);
    console.log('   Recommendations:', result2.recommendations.length > 0 ? result2.recommendations.map(r => r.name).join(', ') : 'None');
    console.log('');

    // ─── Test 3: Crisis Detection ────────────────────
    console.log('📝 Test 3: Crisis Detection');
    console.log('Input: "I want to kill myself"');
    const result3 = await aiService.processAIMessage(
        'I want to kill myself',
        'TestUser',
        []
    );
    console.log('✅ Risk Level:', result3.riskLevel);
    console.log('   Escalated:', result3.escalatedToHuman);
    console.log('   Response:', result3.aiResponse.substring(0, 100) + '...');
    console.log('');

    // ─── Test 4: Depression Detection ────────────────
    console.log('📝 Test 4: Depression Detection');
    console.log('Input: "I feel completely hopeless and I cannot go on anymore"');
    const result4 = await aiService.processAIMessage(
        'I feel completely hopeless and I cannot go on anymore',
        'TestUser',
        []
    );
    console.log('✅ Diagnosis:', result4.diagnosis);
    console.log('   Confidence:', result4.confidence + '%');
    console.log('   Recommendations:', result4.recommendations.length > 0 ? result4.recommendations.map(r => r.name).join(', ') : 'None');

    console.log('\n' + '='.repeat(60));
    console.log('✅ COMPLETE SYSTEM TEST FINISHED!');
    console.log('='.repeat(60) + '\n');
}

testComplete().catch(console.error);