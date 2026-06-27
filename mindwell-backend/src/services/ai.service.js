// src/services/ai.service.js
const axios = require('axios');
const { exec } = require('child_process');
const path = require('path');

// Try to load FAQ service
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

class AIService {
    
    // ─── MAIN FUNCTION - Process user message ──────────────────
    async processAIMessage(message, userName, chatHistory) {
        try {
            console.log(`📤 Processing: "${message}"`);
            
            // ── STEP 1: Check if it's a QUESTION ──────────
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
                        return {
                            diagnosis: null,
                            confidence: 0,
                            severity: 3,
                            top3: [],
                            riskLevel: 'Low',
                            escalatedToHuman: false,
                            aiResponse: faqResult.answer,
                            usedFAQ: true,
                            intent: 'faq',
                            language: faqResult.language || 'english',
                            faqConfidence: faqResult.confidence || 0,
                            recommendations: []
                        };
                    }
                } catch (e) {
                    console.log('⚠️ FAQ lookup failed:', e.message);
                }
            }

            // ── STEP 2: Call AI Service for Diagnosis ──────
            console.log('🧠 Calling AI Service for diagnosis');
            console.log(`📡 Calling: ${AI_SERVICE_URL}/analyze`);
            
            try {
                const response = await axios.post(`${AI_SERVICE_URL}/analyze`, {
                    text: message,
                    user_id: userName || 'anonymous'
                });
                
                console.log('✅ Diagnosis received:', response.data);
                const data = response.data;
                
                // ── Extract diagnosis ──────────────────────────
                const diagnosis = data.diagnosis || null;
                const confidence = data.confidence || 0;
                const severity = data.severity || 5;
                const top3 = data.top3 || [];
                
                console.log(`📊 Diagnosis: ${diagnosis} (${confidence}%)`);
                console.log(`📊 Severity: ${severity}/10`);
                
                // ── Risk Assessment ─────────────────────────────
                let riskLevel = 'Low';
                let escalatedToHuman = false;
                
                if (severity >= 8) {
                    riskLevel = 'High';
                    escalatedToHuman = true;
                } else if (severity >= 6) {
                    riskLevel = 'Moderate';
                }

                // ── Crisis Detection ────────────────────────────
                const crisisWords = ['kill myself', 'suicide', 'end my life', 'want to die', 'self harm'];
                if (crisisWords.some(w => message.toLowerCase().includes(w))) {
                    riskLevel = 'High';
                    escalatedToHuman = true;
                }

                // ── Build AI Response ────────────────────────────
                let aiResponse = '';
                
                if (escalatedToHuman) {
                    aiResponse = `⚠️ I hear you're in pain. Please call the crisis helpline: 0317-4288665. I'm connecting you with a professional now.`;
                } else if (diagnosis && diagnosis !== 'Unknown' && confidence > 30) {
                    aiResponse = `I notice patterns consistent with ${diagnosis} (${confidence.toFixed(1)}% confidence).`;
                    
                    // Add recommendations if available
                    try {
                        const recommenderResult = await this.callRecommender({
                            patient_name: userName || 'Patient',
                            diagnosis: diagnosis,
                            severity_score: severity,
                            session_preference: 'video',
                            language: 'english',
                            mood_logs: chatHistory ? this.extractMoodLogs(chatHistory) : [],
                            chatbot_messages: chatHistory ? chatHistory.map(c => c.message) : [message]
                        });
                        
                        if (recommenderResult.success && recommenderResult.psychologists?.length > 0) {
                            const names = recommenderResult.psychologists.slice(0, 2).map(r => r.name).join(', ');
                            aiResponse += ` I recommend speaking with: ${names}. Would you like to book a session?`;
                        } else {
                            aiResponse += ` Would you like to learn more or speak with a professional?`;
                        }
                    } catch (e) {
                        console.log('⚠️ Recommender failed:', e.message);
                        aiResponse += ` Would you like to learn more or speak with a professional?`;
                    }
                } else {
                    // ── Fallback: Use a more helpful response ────
                    const fallbackResponses = [
                        "I hear you. It sounds like you're going through a tough time. Can you tell me more about what's been on your mind lately? 💙",
                        "Thank you for sharing that with me. I'm here to listen. What else is going on for you right now?",
                        "I understand. Sometimes just talking about it can help. What's been bothering you the most?",
                        "That sounds difficult. I'm here to support you. Would you like to explore some coping strategies together?"
                    ];
                    aiResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
                }

                // ── Get recommendations ──────────────────────────
                let recommendations = [];
                try {
                    if (diagnosis && diagnosis !== 'Unknown') {
                        const recommenderResult = await this.callRecommender({
                            patient_name: userName || 'Patient',
                            diagnosis: diagnosis,
                            severity_score: severity,
                            session_preference: 'video',
                            language: 'english',
                            mood_logs: [],
                            chatbot_messages: [message]
                        });
                        if (recommenderResult.success) {
                            recommendations = recommenderResult.psychologists || [];
                        }
                    }
                } catch (e) {
                    console.log('⚠️ Recommender failed:', e.message);
                }

                return {
                    diagnosis: diagnosis,
                    confidence: confidence,
                    severity: severity,
                    top3: top3,
                    riskLevel: riskLevel,
                    escalatedToHuman: escalatedToHuman,
                    aiResponse: aiResponse,
                    usedFAQ: false,
                    intent: (diagnosis || 'general').toLowerCase().replace(/\s+/g, '_'),
                    language: 'english',
                    recommendations: recommendations
                };

            } catch (apiError) {
                console.error('❌ API call failed:', apiError.message);
                return {
                    diagnosis: null,
                    confidence: 0,
                    severity: 5,
                    top3: [],
                    riskLevel: 'Low',
                    escalatedToHuman: false,
                    aiResponse: "I'm having trouble connecting to my brain right now. Please try again in a moment. 🔌",
                    usedFAQ: false,
                    intent: 'error',
                    language: 'english',
                    recommendations: []
                };
            }

        } catch (error) {
            console.error('❌ AI Service error:', error.message);
            return {
                diagnosis: null,
                confidence: 0,
                severity: 5,
                top3: [],
                riskLevel: 'Low',
                escalatedToHuman: false,
                aiResponse: "I'm having trouble understanding right now. Could you try again? 💙",
                usedFAQ: false,
                intent: 'error',
                language: 'english',
                recommendations: []
            };
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
                    } catch (parseError) {
                        resolve({ success: false, error: 'Failed to parse response' });
                    }
                }
            );
            
            pythonProcess.stdin.write(inputData);
            pythonProcess.stdin.end();
        });
    }

    // ─── Extract Mood Logs ──────────────────────────────────────
    extractMoodLogs(chatHistory) {
        const moodLogs = [];
        const moodKeywords = {
            'happy': 8, 'good': 7, 'okay': 5, 'sad': 3, 
            'anxious': 4, 'depressed': 2, 'angry': 3, 'hopeless': 2
        };
        
        const recent = chatHistory.slice(-5);
        recent.forEach((msg, index) => {
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
            
            moodLogs.push({
                day: `Day ${index + 1}`,
                score: score,
                emotion: emotion,
                note: msg.message.substring(0, 100)
            });
        });
        
        return moodLogs;
    }

    // ─── Other helper functions ──────────────────────────────────
    async getDiagnosisOnly(message) {
        try {
            const response = await axios.post(`${AI_SERVICE_URL}/diagnosis`, {
                text: message
            });
            return {
                success: true,
                diagnosis: response.data.diagnosis,
                confidence: response.data.confidence,
                normalizedText: response.data.normalized_text
            };
        } catch (error) {
            return { success: false, diagnosis: null, confidence: 0 };
        }
    }

    async getSentimentOnly(message) {
        try {
            const response = await axios.post(`${AI_SERVICE_URL}/sentiment`, {
                text: message
            });
            return {
                success: true,
                emotion: response.data.emotion,
                confidence: response.data.confidence,
                severityScore: response.data.severity_score,
                normalizedText: response.data.normalized_text
            };
        } catch (error) {
            return { success: false, emotion: null, severityScore: 5 };
        }
    }

    async healthCheck() {
        try {
            const response = await axios.get(`${AI_SERVICE_URL}/health`);
            return response.data;
        } catch (error) {
            return { status: 'unavailable', model_loaded: false };
        }
    }
}

module.exports = new AIService();