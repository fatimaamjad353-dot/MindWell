// src/controllers/ai.controller.js
const Chatbot = require('../models/Chatbot');
const MoodEntry = require('../models/MoodEntry');
const aiService = require('../services/ai.service');
const axios = require('axios');

const PYTHON_AI_URL = process.env.PYTHON_AI_URL || 'http://localhost:5001';

// ─── Call Python /analyze (Diagnosis + Sentiment + Severity) ─────────────────
const analyzeSentiment = async (text) => {
    try {
        const response = await axios.post(
            `${PYTHON_AI_URL}/analyze`,
            { text },
            { timeout: 15000 }
        );
        return response.data;
    } catch (error) {
        console.error('Python AI service unavailable:', error.message);
        return null;
    }
};

// ─── SEND MESSAGE TO AI ───────────────────────────────────────────────────────
const sendMessage = async (req, res) => {
    try {
        const { message, chatId, language } = req.body;

        if (!message) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a message'
            });
        }

        const patientName = req.user?.name || 'there';

        let chat;
        let chatHistory = [];

        if (chatId) {
            chat = await Chatbot.findById(chatId);
            if (!chat) {
                return res.status(404).json({
                    success: false,
                    message: 'Chat session not found'
                });
            }
            chatHistory = chat.messages || [];
        }

        // ─── Process message through FAQ / Chatbot AI Service ────────────────
        const aiResult = await aiService.processAIMessage(
            message,
            patientName,
            chatHistory
        );

        // ─── Analyze with Python Diagnosis + Sentiment Model ─────────────────
        const sentimentResult = await analyzeSentiment(message);

        // ─── Merge severity into risk level ──────────────────────────────────
        let finalRiskLevel = aiResult.riskLevel;

        if (sentimentResult?.needs_help) {
            const sev = sentimentResult.severity;          // number 1–10
            if (sev >= 8) {
                finalRiskLevel = 'High';
            } else if (sev >= 6 && finalRiskLevel !== 'High') {
                finalRiskLevel = 'Medium';
            }
        }

        const detectedLanguage = language || aiResult.language || 'english';

        // ─── Save to Database ─────────────────────────────────────────────────
        if (chatId) {
            chat.messages.push({ sender: 'patient', message });
            chat.messages.push({ sender: 'ai',      message: aiResult.aiResponse });

            chat.riskLevel          = finalRiskLevel;
            chat.intent_recognition = aiResult.intent;
            chat.chat_text          = message;
            chat.escalatedToHuman   = aiResult.escalatedToHuman;
            chat.language           = detectedLanguage;
            chat.usedFAQ            = aiResult.usedFAQ;

            if (sentimentResult?.needs_help) {
                chat.diagnosis           = sentimentResult.diagnosis;
                chat.diagnosisConfidence = sentimentResult.confidence;
                chat.severity            = sentimentResult.severity;
                chat.severityLabel       = sentimentResult.severity_label;
            }

            await chat.save();

        } else {
            chat = await Chatbot.create({
                patientId:          req.user._id,
                patientName,
                chat_text:          message,
                intent_recognition: aiResult.intent,
                greeting:           aiResult.intent === 'greeting' ? aiResult.aiResponse : '',
                riskLevel:          finalRiskLevel,
                escalatedToHuman:   aiResult.escalatedToHuman,
                language:           detectedLanguage,
                usedFAQ:            aiResult.usedFAQ,
                diagnosis:          sentimentResult?.needs_help ? sentimentResult.diagnosis       : null,
                diagnosisConfidence:sentimentResult?.needs_help ? sentimentResult.confidence      : null,
                severity:           sentimentResult?.needs_help ? sentimentResult.severity        : null,
                severityLabel:      sentimentResult?.needs_help ? sentimentResult.severity_label  : null,
                messages: [
                    { sender: 'patient', message },
                    { sender: 'ai',      message: aiResult.aiResponse }
                ]
            });
        }

        // ─── If crisis, create a mood entry ──────────────────────────────────
        if (aiResult.intent === 'crisis' || finalRiskLevel === 'High') {
            await MoodEntry.create({
                patientId: req.user._id,
                moodScore: 1,
                moodType:  'Anxious',
                notes:     `Crisis detected: ${message.substring(0, 100)}`,
                aiAnalysis: {
                    sentiment:   'Negative',
                    riskLevel:   'High',
                    suggestion:  'Immediate professional consultation is strongly recommended.'
                }
            });
        }

        // ─── Response ─────────────────────────────────────────────────────────
        res.status(200).json({
            success: true,
            data: {
                chatId:           chat._id,
                intent:           aiResult.intent,
                riskLevel:        finalRiskLevel,
                escalatedToHuman: aiResult.escalatedToHuman,
                aiResponse:       aiResult.aiResponse,
                language:         detectedLanguage,
                usedFAQ:          aiResult.usedFAQ,
                diagnosis: sentimentResult?.needs_help
                    ? {
                        label:          sentimentResult.diagnosis,
                        confidence:     sentimentResult.confidence,
                        severity:       sentimentResult.severity,
                        severityLabel:  sentimentResult.severity_label,
                        top3:           sentimentResult.top3,
                        needsHelp:      true
                      }
                    : {
                        label:     'No issue detected',
                        needsHelp: false
                      },
                messages: chat.messages
            }
        });

    } catch (error) {
        console.error('AI Chat Error:', error.message);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ─── GET CHAT HISTORY ─────────────────────────────────────────────────────────
const getChatHistory = async (req, res) => {
    try {
        const chats = await Chatbot.find({
            patientId: req.user._id
        }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: chats.length,
            data:  chats
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── GET SINGLE CHAT ──────────────────────────────────────────────────────────
const getSingleChat = async (req, res) => {
    try {
        const chat = await Chatbot.findById(req.params.id);

        if (!chat) {
            return res.status(404).json({
                success: false,
                message: 'Chat not found'
            });
        }

        res.status(200).json({ success: true, data: chat });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── GET RISK SCORE ───────────────────────────────────────────────────────────
const getRiskScore = async (req, res) => {
    try {
        const latestChat = await Chatbot.findOne({
            patientId: req.user._id
        }).sort({ createdAt: -1 });

        const latestMood = await MoodEntry.findOne({
            patientId: req.user._id
        }).sort({ createdAt: -1 });

        let overallRisk     = 'Low';
        let reasons         = [];
        let recommendations = [];

        if (latestChat) {
            if (latestChat.riskLevel === 'High') {
                overallRisk = 'High';
                reasons.push('High risk detected in AI chat');
                recommendations.push('Immediate professional consultation is strongly recommended');
            } else if (latestChat.riskLevel === 'Medium') {
                if (overallRisk !== 'High') overallRisk = 'Medium';
                reasons.push('Medium risk detected in AI chat');
                recommendations.push('Consider booking a therapy session soon');
            }

            if (latestChat.diagnosis && latestChat.diagnosis !== 'Normal') {
                reasons.push(
                    `Diagnosis: ${latestChat.diagnosis} — severity ${latestChat.severity} (${latestChat.severityLabel})`
                );
            }
        }

        if (latestMood?.aiAnalysis?.riskLevel === 'High') {
            overallRisk = 'High';
            reasons.push('High risk mood logged recently');
            recommendations.push('Immediate professional consultation is strongly recommended');
        }

        if (recommendations.length === 0) {
            recommendations.push('Keep up your self-care routine');
        }

        res.status(200).json({
            success: true,
            data: {
                overallRisk,
                reasons:          reasons.length > 0 ? reasons : ['No significant risk detected'],
                recommendation:   recommendations[0],
                recommendations,
                latestDiagnosis:  latestChat?.diagnosis     || null,
                latestSeverity:   latestChat?.severity      || null,
                latestSevLabel:   latestChat?.severityLabel || null,
                latestMoodScore:  latestMood?.moodScore     || null,
                escalatedToHuman: latestChat?.escalatedToHuman || false,
                lastChatDate:     latestChat?.createdAt     || null,
                lastMoodDate:     latestMood?.createdAt     || null
            }
        });

    } catch (error) {
        console.error('Risk Score Error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── END USER SESSION ─────────────────────────────────────────────────────────
const endUser = async (req, res) => {
    try {
        const { userId } = req.params;

        const updatedChat = await Chatbot.findOneAndUpdate(
            { patientId: userId, endedAt: null },
            { endedAt: new Date() },
            { sort: { createdAt: -1 }, new: true }
        );

        res.status(200).json({
            success:  true,
            message:  'User session ended successfully',
            data:     updatedChat
        });

    } catch (error) {
        console.error('End User Error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    sendMessage,
    getChatHistory,
    getSingleChat,
    getRiskScore,
    endUser
};