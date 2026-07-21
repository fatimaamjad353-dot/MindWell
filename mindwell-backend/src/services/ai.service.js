// src/services/ai.service.js
const axios = require('axios');
const { exec } = require('child_process');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ─── Initialize Gemini ─────────────────────────────────────────
let genAI = null;
let geminiModel = null;

if (process.env.GEMINI_API_KEY) {
    try {
        genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        
        // Use gemini-pro which is widely available
        const modelName = "gemini-pro";
        
        geminiModel = genAI.getGenerativeModel({ 
            model: modelName,
            generationConfig: {
                temperature: 0.9,
                maxOutputTokens: 150,
                topP: 0.95,
                topK: 40,
            }
        });
        console.log(`✅ Gemini AI initialized successfully (model: ${modelName})`);
    } catch (error) {
        console.error('❌ Failed to initialize Gemini:', error.message);
    }
} else {
    console.log('⚠️ GEMINI_API_KEY not found in .env');
}

// ─── Try to load FAQ service ──────────────────────────────────
let faqService;
try {
    faqService = require('./faq.service');
    console.log('✅ FAQ Service loaded');
} catch (error) {
    console.log('⚠️ FAQ Service not available, using fallback');
    faqService = {
        isQuestion: () => false,
        getFAQResponse: async () => ({ found: false, answer: null })
    };
}

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5010';

// ─── Track shown diagnoses per session ───────────────────────
const sessionDiagnosisCache = new Map();
const sessionCrisisShown = new Map();
const responseHistory = new Map(); // Track recent responses to avoid repetition

class AIService {

    // ─── Generate human-like response using Gemini ─────────────
    async generateHumanResponse(message, userName, diagnosis, confidence, severity, riskLevel, chatHistory, language) {
        try {
            const hasDiagnosis = diagnosis && diagnosis !== 'Unknown' && diagnosis !== 'No issue detected' && confidence > 50;
            const severityLabel = severity >= 7 ? 'High' : severity >= 5 ? 'Moderate' : 'Low';

            // ─── Build conversation context ──────────────────────
            let conversationContext = '';
            if (chatHistory && chatHistory.length > 0) {
                const lastMessages = chatHistory.slice(-6);
                conversationContext = lastMessages.map(msg => {
                    const sender = msg.sender === 'patient' ? 'User' : 'MindWell';
                    return `${sender}: ${msg.message}`;
                }).join('\n');
            }

            // ─── Detect emotional state ──────────────────────────
            const emotionalState = this.detectEmotionalState(message);

            // ─── Get recent response to avoid repetition ────────
            const recentResponses = responseHistory.get(userName) || [];
            const avoidPhrases = recentResponses.slice(-3).join(' ');

            // ─── Build system prompt ─────────────────────────────
            let systemPrompt = `You are MindWell, a warm and empathetic AI mental health companion. 
You are NOT a therapist or doctor. You provide supportive, caring conversations.

Current conversation context:
${conversationContext || 'New conversation'}

User's name: ${userName}
User's message: "${message}"
Detected emotional state: ${emotionalState}

${hasDiagnosis ? `Clinical insight (use subtly): The user's message shows patterns of ${diagnosis} (${confidence.toFixed(1)}% confidence).` : ''}

${riskLevel === 'High' ? '⚠️ The user may be in distress. Be extra gentle and suggest professional help.' : ''}

⚠️ IMPORTANT: DO NOT use these phrases (they've been used recently):
${avoidPhrases || 'None'}

Language rules:
- ${language === 'ur' ? 'Respond in Roman Urdu' : language === 'ar' ? 'Respond in Arabic' : 'Respond in English'}

CRITICAL RESPONSE RULES:
1. DIRECTLY respond to what the user just said - reference their specific words
2. If they mentioned "project" → ask about their project
3. If they mentioned "lonely" → ask about connection/support
4. If they mentioned "anxious" → ask about triggers or coping
5. NEVER use the same response twice - VARY your responses
6. 2-3 sentences maximum
7. Sound like a caring friend, not a robot
8. Ask ONE relevant follow-up question

Examples of GOOD responses for different situations:
- User: "I'm stressed about work" → "Work stress can be so draining. What part of your project is feeling most stuck right now?"
- User: "I feel lonely" → "Loneliness is really tough. Have you been able to connect with friends or family lately?"
- User: "I'm anxious" → "Anxiety can feel overwhelming. What's been triggering these feelings recently?"
- User: "I need motivation" → "Lack of motivation is hard. Sometimes starting with one small step helps. What's one thing you could do today?"
- User: "I'm happy" → "That's wonderful to hear! 😊 What's been making you feel this way?"`;

            // ─── Check if Gemini is available ────────────────────
            if (!geminiModel) {
                console.log('⚠️ Gemini not available, using fallback');
                return this.getFallbackResponse(message, userName);
            }

            // ─── Call Gemini API ──────────────────────────────────
            console.log('🤖 Generating response with Gemini...');
            
            const result = await geminiModel.generateContent({
                contents: [
                    {
                        role: 'user',
                        parts: [{ text: systemPrompt + '\n\nUser: ' + message }]
                    }
                ],
                generationConfig: {
                    temperature: 0.9,
                    maxOutputTokens: 150,
                    topP: 0.95,
                    topK: 40,
                }
            });

            const response = result.response;
            let aiResponse = response.text().trim();

            // ─── Clean up response if needed ─────────────────────
            if (aiResponse.length < 5 || aiResponse.length > 250) {
                aiResponse = this.getFallbackResponse(message, userName);
            }

            // ─── Store response to avoid repetition ─────────────
            const history = responseHistory.get(userName) || [];
            history.push(aiResponse);
            if (history.length > 10) history.shift();
            responseHistory.set(userName, history);

            console.log('✅ Gemini response generated');
            return aiResponse;

        } catch (error) {
            console.error('❌ Gemini error:', error.message);
            return this.getFallbackResponse(message, userName);
        }
    }

    // ─── Simple keyword-based diagnosis (fallback) ────────────
    getSimpleDiagnosis(message) {
        const lowerMsg = message.toLowerCase();
        
        const patterns = {
            'Anxiety': ['anxiety', 'anxious', 'worry', 'nervous', 'panic', 'overwhelmed', 'scared', 'fear'],
            'Depression': ['depress', 'sad', 'hopeless', 'down', 'empty', 'worthless', 'crying', 'tears'],
            'Stress': ['stress', 'pressure', 'burnout', 'exhausted', 'overwhelmed', 'tired'],
            'Loneliness': ['lonely', 'alone', 'isolated', 'abandoned', 'no one'],
            'ADHD': ['focus', 'concentrate', 'distracted', 'attention', 'hyper'],
            'PTSD': ['trauma', 'flashback', 'nightmare', 'trigger', 'ptsd'],
            'Bipolar': ['mood swing', 'manic', 'bipolar', 'extreme mood'],
            'OCD': ['obsess', 'compulsive', 'intrusive', 'ocd']
        };

        for (const [diagnosis, keywords] of Object.entries(patterns)) {
            if (keywords.some(k => lowerMsg.includes(k))) {
                const confidence = 70 + Math.floor(Math.random() * 25);
                const severity = confidence > 85 ? 'Moderate' : 'Low';
                return { diagnosis, confidence, severity };
            }
        }
        return { diagnosis: null, confidence: 0, severity: 'Unknown' };
    }

    // ─── Detect emotional state from message ──────────────────
    detectEmotionalState(message) {
        const lowerMsg = message.toLowerCase();
        const emotions = {
            'anxious': ['anxious', 'anxiety', 'worried', 'nervous', 'panic', 'overwhelmed'],
            'sad': ['sad', 'depressed', 'down', 'hopeless', 'crying', 'tears', 'lonely'],
            'angry': ['angry', 'mad', 'frustrated', 'irritated', 'rage'],
            'happy': ['happy', 'good', 'great', 'wonderful', 'amazing', 'joy', 'excited'],
            'stressed': ['stressed', 'pressure', 'burnout', 'exhausted', 'tired'],
            'hopeful': ['hope', 'hopeful', 'optimistic', 'better'],
            'neutral': ['okay', 'fine', 'normal', 'alright']
        };

        for (const [emotion, keywords] of Object.entries(emotions)) {
            if (keywords.some(k => lowerMsg.includes(k))) {
                return emotion;
            }
        }
        return 'unknown';
    }

    // ─── Fallback responses ────────────────────────────────────
    getFallbackResponse(message, userName) {
        const lowerMsg = message.toLowerCase();
        
        // Positive responses
        if (lowerMsg.includes('happy') || lowerMsg.includes('good') || lowerMsg.includes('great')) {
            const responses = [
                `That's wonderful to hear, ${userName}! 😊 What's been making you feel this way?`,
                `I'm so glad to hear that, ${userName}! What's contributed to this positive feeling?`,
                `That's great news, ${userName}! 😊 What's been going well for you?`
            ];
            return responses[Math.floor(Math.random() * responses.length)];
        }
        
        // Stress responses
        if (lowerMsg.includes('stress') || lowerMsg.includes('work') || lowerMsg.includes('project')) {
            const responses = [
                `Work stress can be really draining, ${userName}. What part of your project is feeling most stuck?`,
                `I hear you, ${userName}. Projects can be overwhelming. What's the biggest challenge you're facing?`,
                `That sounds tough, ${userName}. Are you able to take breaks or delegate any parts of your project?`
            ];
            return responses[Math.floor(Math.random() * responses.length)];
        }
        
        // Loneliness responses
        if (lowerMsg.includes('lonely') || lowerMsg.includes('alone')) {
            const responses = [
                `Loneliness is really tough, ${userName}. Have you been able to connect with friends or family lately?`,
                `I'm sorry you're feeling that way, ${userName}. Is there anyone you feel comfortable reaching out to?`,
                `That's a hard feeling to carry, ${userName}. Would you like to talk about what's been making you feel this way?`
            ];
            return responses[Math.floor(Math.random() * responses.length)];
        }
        
        // Sadness responses
        if (lowerMsg.includes('sad') || lowerMsg.includes('down')) {
            const responses = [
                `I hear you, ${userName}. It's okay to feel this way. What's been on your mind lately?`,
                `I'm sorry you're feeling down, ${userName}. Do you want to talk about what's been bothering you?`,
                `That sounds really hard, ${userName}. I'm here to listen if you want to share more.`
            ];
            return responses[Math.floor(Math.random() * responses.length)];
        }
        
        // Motivation responses
        if (lowerMsg.includes('motivation') || lowerMsg.includes('energy')) {
            const responses = [
                `Lack of motivation is really hard, ${userName}. Sometimes starting with one small step helps. What's one thing you could do today?`,
                `I understand that feeling, ${userName}. What's something that usually helps you feel motivated?`,
                `That's a tough place to be, ${userName}. Could you try breaking things down into smaller, manageable steps?`
            ];
            return responses[Math.floor(Math.random() * responses.length)];
        }
        
        // Anxious responses
        if (lowerMsg.includes('anxious') || lowerMsg.includes('worry')) {
            const responses = [
                `Anxiety can feel overwhelming, ${userName}. Do you want to talk about what's triggering it?`,
                `I understand that anxiety is really hard, ${userName}. What helps you calm down when you feel this way?`,
                `That sounds really difficult, ${userName}. Would you like to try some grounding techniques together?`
            ];
            return responses[Math.floor(Math.random() * responses.length)];
        }

        // Default varied responses
        const defaultResponses = [
            `I hear you, ${userName}. Tell me more about what's going on.`,
            `That sounds like a lot to carry, ${userName}. I'm here to listen.`,
            `I appreciate you sharing that with me, ${userName}. What's been on your mind most?`,
            `Thank you for being open with me, ${userName}. How long have you been feeling this way?`,
            `I'm here for you, ${userName}. What would be most helpful to talk about right now?`
        ];
        return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
    }

    // ─── Check if user is asking "what's wrong with me" ──────
    isAskingForDiagnosis(message) {
        const patterns = [
            'what\'s wrong with me', 'what is wrong with me', 'whats wrong with me',
            'what do i have', 'do i have', 'is this', 'whats happening to me',
            'what is happening to me', 'why do i feel', 'why am i',
            'am i depressed', 'am i anxious', 'do i have anxiety',
            'do i have depression', 'diagnose me', 'tell me what i have'
        ];
        return patterns.some(p => message.toLowerCase().includes(p));
    }

    // ─── Check if user is in crisis ───────────────────────────
    isCrisis(message) {
        const crisisWords = [
            'kill myself', 'suicide', 'end my life', 'want to die',
            'self harm', 'hurt myself', 'cut myself', 'die',
            'i want to die', 'i should die', 'i cant live',
            'worthless', 'no hope', 'never get better'
        ];
        return crisisWords.some(w => message.toLowerCase().includes(w));
    }

    // ─── Decide whether to show diagnosis card ────────────────
    shouldShowDiagnosisCard(sessionId, diagnosis, confidence, riskLevel, message) {
        // Rule 1: Confidence < 50% → Nothing
        if (confidence < 50) {
            console.log(`📊 Confidence ${confidence}% < 50% → No card`);
            return false;
        }

        // Rule 2: No diagnosis → Nothing
        if (!diagnosis || diagnosis === 'Unknown' || diagnosis === 'No issue detected') {
            console.log('📊 No diagnosis → No card');
            return false;
        }

        // Rule 3: Same diagnosis already shown → No card
        const cacheKey = `${sessionId}_${diagnosis}`;
        if (sessionDiagnosisCache.has(cacheKey)) {
            console.log(`📊 Diagnosis "${diagnosis}" already shown → No card`);
            return false;
        }

        // Rule 4: User asks "what's wrong with me" → Show card
        if (this.isAskingForDiagnosis(message)) {
            console.log('📊 User asked for diagnosis → Show card');
            sessionDiagnosisCache.set(cacheKey, true);
            return true;
        }

        // Rule 5: Confidence > 70% first time → Show card
        if (confidence >= 70) {
            console.log(`📊 Confidence ${confidence}% ≥ 70% first time → Show card`);
            sessionDiagnosisCache.set(cacheKey, true);
            return true;
        }

        console.log('📊 No conditions met → No card');
        return false;
    }

    // ─── Check if crisis card should show ─────────────────────
    shouldShowCrisis(sessionId, riskLevel, message) {
        if (this.isCrisis(message) || riskLevel === 'High') {
            if (!sessionCrisisShown.has(sessionId)) {
                sessionCrisisShown.set(sessionId, true);
                return true;
            }
        }
        return false;
    }

    // ─── MAIN FUNCTION - Process user message ─────────────────
    async processAIMessage(message, userName, chatHistory, sessionId) {
        try {
            console.log(`📤 Processing: "${message}"`);
            console.log(`🆔 Session: ${sessionId}`);

            // ── STEP 1: Check for CRISIS ─────────────────────────
            const isCrisisMessage = this.isCrisis(message);
            if (isCrisisMessage) {
                console.log('🚨 CRISIS DETECTED');
                return {
                    diagnosis: null,
                    confidence: 0,
                    severity: 'Severe',
                    top3: [],
                    riskLevel: 'High',
                    escalatedToHuman: true,
                    aiResponse: "I'm really concerned about you right now, and I want you to know that you matter. Please reach out to our crisis helpline immediately: 0317-4288665. You don't have to go through this alone. 💙",
                    usedFAQ: false,
                    intent: 'crisis',
                    language: 'english',
                    recommendations: [],
                    showDiagnosisCard: false,
                    diagnosisCardData: null,
                    showCrisisCard: true
                };
            }

            // ── STEP 2: Check if it's a FAQ QUESTION ──────────
            let isQuestion = false;
            try {
                isQuestion = faqService.isQuestion(message);
            } catch (e) {
                console.log('⚠️ FAQ check failed:', e.message);
            }

            if (isQuestion) {
                console.log('🔍 Detected as QUESTION → Using FAQ model');
                try {
                    const faqResult = await faqService.getFAQResponse(message);
                    if (faqResult.found) {
                        console.log('✅ FAQ found!');
                        const humanFaqResponse = await this.makeHumanLike(faqResult.answer, userName);
                        return {
                            diagnosis: null,
                            confidence: 0,
                            severity: 'Low',
                            top3: [],
                            riskLevel: 'Low',
                            escalatedToHuman: false,
                            aiResponse: humanFaqResponse,
                            usedFAQ: true,
                            intent: 'faq',
                            language: faqResult.language || 'english',
                            faqConfidence: faqResult.confidence || 0,
                            recommendations: [],
                            showDiagnosisCard: false,
                            diagnosisCardData: null,
                            showCrisisCard: false
                        };
                    }
                } catch (e) {
                    console.log('⚠️ FAQ lookup failed:', e.message);
                }
            }

            // ── STEP 3: Call Sentiment/Diagnosis Model ─────────
            console.log('🧠 Calling AI Service for diagnosis...');

            let diagnosis = null;
            let confidence = 0;
            let severity = 'Unknown';
            let severityConfidence = 0;
            let top3 = [];
            let language = 'english';

            try {
                const response = await axios.post(`${AI_SERVICE_URL}/analyze`, {
                    text: message,
                    user_id: userName || 'anonymous'
                }, { timeout: 10000 });

                const data = response.data;
                diagnosis = data.diagnosis || null;
                confidence = data.confidence || 0;
                severity = data.severity || 'Unknown';
                severityConfidence = data.severity_confidence || 0;
                top3 = data.top3 || [];

                console.log(`📊 Diagnosis: ${diagnosis} (${confidence}%)`);
                console.log(`📊 Severity: ${severity}`);

            } catch (apiError) {
                console.log('⚠️ Sentiment model error, using fallback');
                const simple = this.getSimpleDiagnosis(message);
                diagnosis = simple.diagnosis;
                confidence = simple.confidence;
                severity = simple.severity;
                top3 = diagnosis ? [{ label: diagnosis, confidence: confidence }] : [];
                console.log(`📊 Fallback Diagnosis: ${diagnosis} (${confidence}%)`);
            }

            // ── STEP 4: Risk Assessment ────────────────────────
            let riskLevel = 'Low';
            let escalatedToHuman = false;

            if (isCrisisMessage) {
                riskLevel = 'High';
                escalatedToHuman = true;
            } else if (severity === 'Severe') {
                riskLevel = 'High';
                escalatedToHuman = true;
            } else if (severity === 'Moderate') {
                riskLevel = 'Medium';
            }

            // ── STEP 5: Generate Response ─────────────────────────
            let aiResponse = '';

            if (isCrisisMessage) {
                aiResponse = `I'm really concerned about you right now. Please reach out to our crisis helpline immediately: 0317-4288665. You don't have to go through this alone. 💙`;
            } else {
                // Use Gemini for response
                aiResponse = await this.generateHumanResponse(
                    message,
                    userName,
                    diagnosis,
                    confidence,
                    severity === 'Severe' ? 8 : severity === 'Moderate' ? 6 : 3,
                    riskLevel,
                    chatHistory,
                    language
                );
            }

            // ── STEP 6: Apply Rules for Diagnosis Card ────────
            const showDiagnosisCard = this.shouldShowDiagnosisCard(
                sessionId || userName,
                diagnosis,
                confidence,
                riskLevel,
                message
            );

            // ── STEP 7: Check if Crisis Card should show ──────
            const showCrisisCard = this.shouldShowCrisis(
                sessionId || userName,
                riskLevel,
                message
            );

            // ── STEP 8: Get recommendations if needed ──────────
            let recommendations = [];
            if (severity === 'Severe' || severity === 'Moderate' || showDiagnosisCard) {
                try {
                    const recommenderResult = await this.callRecommender({
                        patient_name: userName || 'Patient',
                        diagnosis: diagnosis,
                        severity_score: severity === 'Severe' ? 8 : 6,
                        session_preference: 'video',
                        language: 'english',
                        mood_logs: chatHistory ? this.extractMoodLogs(chatHistory) : [],
                        chatbot_messages: chatHistory ? chatHistory.map(c => c.message) : [message]
                    });

                    if (recommenderResult.success && recommenderResult.psychologists?.length > 0) {
                        recommendations = recommenderResult.psychologists.slice(0, 2);
                    }
                } catch (e) {
                    console.log('⚠️ Recommender failed:', e.message);
                }
            }

            // ── STEP 9: Return Result ──────────────────────────
            return {
                diagnosis,
                confidence,
                severity,
                severityConfidence,
                top3,
                riskLevel,
                escalatedToHuman,
                aiResponse,
                usedFAQ: false,
                intent: isCrisisMessage ? 'crisis' : (diagnosis || 'general').toLowerCase().replace(/\s+/g, '_'),
                language,
                recommendations,
                showDiagnosisCard: showDiagnosisCard && !showCrisisCard,
                diagnosisCardData: showDiagnosisCard && !showCrisisCard ? {
                    label: diagnosis,
                    confidence: confidence.toFixed(1),
                    severity: severity === 'Severe' ? 'Severe' : severity === 'Moderate' ? 'Moderate' : 'Mild',
                    top3: top3 || []
                } : null,
                showCrisisCard: showCrisisCard
            };

        } catch (error) {
            console.error('❌ AI Service error:', error.message);
            return {
                diagnosis: null,
                confidence: 0,
                severity: 'Unknown',
                top3: [],
                riskLevel: 'Low',
                escalatedToHuman: false,
                aiResponse: "I'm here for you. Could you tell me a little more about how you're feeling right now? 💙",
                usedFAQ: false,
                intent: 'error',
                language: 'english',
                recommendations: [],
                showDiagnosisCard: false,
                diagnosisCardData: null,
                showCrisisCard: false
            };
        }
    }

    // ─── Make FAQ answers sound human ─────────────────────────
    async makeHumanLike(faqAnswer, userName) {
        try {
            if (!geminiModel) return faqAnswer;
            
            const result = await geminiModel.generateContent({
                contents: [
                    {
                        role: 'user',
                        parts: [{ 
                            text: `Rephrase this FAQ answer to sound warm, friendly and conversational. 
                            Make it 2-3 sentences. No bullet points.\n\nFAQ: ${faqAnswer}` 
                        }]
                    }
                ],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 120,
                }
            });
            
            const response = result.response;
            return response.text().trim();
        } catch {
            return faqAnswer;
        }
    }

    // ─── Recommender Call ──────────────────────────────────────
    async callRecommender(data) {
        return new Promise((resolve) => {
            const wrapperPath = path.join(__dirname, '../ai-models/recommender_wrapper.py');
            const fs = require('fs');
            if (!fs.existsSync(wrapperPath)) {
                resolve({ success: false, error: 'Wrapper not found' });
                return;
            }

            const inputData = JSON.stringify(data);
            const pythonProcess = exec(
                `python "${wrapperPath}"`,
                { maxBuffer: 1024 * 1024 * 10 },
                (error, stdout, stderr) => {
                    if (error) {
                        resolve({ success: false, error: error.message });
                        return;
                    }
                    try {
                        const result = JSON.parse(stdout);
                        resolve(result);
                    } catch {
                        resolve({ success: false, error: 'Failed to parse response' });
                    }
                }
            );

            pythonProcess.stdin.write(inputData);
            pythonProcess.stdin.end();
        });
    }

    // ─── Extract Mood Logs ─────────────────────────────────────
    extractMoodLogs(chatHistory) {
        const moodKeywords = {
            'happy': 8, 'good': 7, 'okay': 5, 'sad': 3,
            'anxious': 4, 'depressed': 2, 'angry': 3, 'hopeless': 2
        };

        return chatHistory.slice(-5).map((msg, index) => {
            const text = msg.message.toLowerCase();
            let score = 5;
            let emotion = 'neutral';

            for (const [word, value] of Object.entries(moodKeywords)) {
                if (text.includes(word)) {
                    score = value;
                    emotion = word;
                    break;
                }
            }

            return {
                day: `Day ${index + 1}`,
                score,
                emotion,
                note: msg.message.substring(0, 100)
            };
        });
    }

    // ─── Health Check ──────────────────────────────────────────
    async healthCheck() {
        try {
            if (geminiModel) {
                const result = await geminiModel.generateContent({
                    contents: [{ role: 'user', parts: [{ text: 'Hello' }] }]
                });
                return { status: 'ok', provider: 'gemini', model: 'gemini-pro' };
            }
            return { status: 'unavailable', provider: 'none' };
        } catch {
            return { status: 'unavailable', provider: 'gemini', error: true };
        }
    }
}

module.exports = new AIService();