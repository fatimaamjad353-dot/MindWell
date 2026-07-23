// src/controllers/recommender.controller.js
const MoodEntry = require('../models/MoodEntry');
const Chatbot = require('../models/Chatbot');
const Psychiatrist = require('../models/Psychiatrist');
const Patient = require('../models/Patient');
const TriageSummary = require('../models/TriageSummary');

// ─── Diagnosis to Specialization Map ─────────────────────────
const DIAG_SPEC_MAP = {
    'Anxiety': 'Anxiety & Stress Management',
    'Depression': 'Depression & Mood Disorders',
    'ADHD': 'ADHD & Behavioral Issues',
    'PTSD': 'Trauma & PTSD',
    'Bipolar': 'Bipolar Disorder',
    'OCD': 'OCD & Anxiety',
    'Schizophrenia': 'Psychosis & Schizophrenia',
    'Stress': 'Anxiety & Stress Management',
    'Insomnia': 'Sleep Disorders',
    'Eating': 'Eating Disorders',
    'Social Anxiety': 'Anxiety & Stress Management',
    'Panic': 'Anxiety & Stress Management',
};

// ─── Self Care Resources Map ──────────────────────────────────
const RESOURCES_MAP = {
    'Anxiety': [
        { title: 'Deep Breathing Exercises', type: 'Exercise', description: 'Practice 4-7-8 breathing to reduce anxiety instantly', link: 'https://www.healthline.com/health/4-7-8-breathing' },
        { title: 'Progressive Muscle Relaxation', type: 'Exercise', description: 'Systematically tense and relax muscle groups to release stress', link: 'https://www.verywellmind.com/how-do-you-do-progressive-muscle-relaxation-3144782' },
        { title: 'Mindfulness Meditation', type: 'Meditation', description: 'Daily mindfulness practice proven to reduce anxiety symptoms', link: 'https://www.mindful.org/meditation/mindfulness-getting-started/' },
        { title: 'Grounding Technique 5-4-3-2-1', type: 'Exercise', description: 'Use your senses to ground yourself during anxiety attacks', link: 'https://www.therapistaid.com/therapy-worksheet/5-4-3-2-1-grounding-technique' },
    ],
    'Depression': [
        { title: 'Behavioral Activation', type: 'Therapy Technique', description: 'Schedule activities that bring joy and sense of accomplishment', link: 'https://www.psychologytools.com/resource/behavioral-activation-for-depression/' },
        { title: 'Exercise for Depression', type: 'Exercise', description: '30 minutes of cardio daily can significantly reduce depressive symptoms', link: 'https://www.mayoclinic.org/diseases-conditions/depression/in-depth/depression-and-exercise/art-20046495' },
        { title: 'Sleep Hygiene Guide', type: 'Lifestyle', description: 'Improve your sleep quality to reduce depression symptoms', link: 'https://www.sleepfoundation.org/sleep-hygiene' },
        { title: 'Gratitude Journaling', type: 'Writing', description: 'Write 3 things you are grateful for every day', link: 'https://greatergood.berkeley.edu/article/item/tips_for_keeping_a_gratitude_journal' },
    ],
    'ADHD': [
        { title: 'Time Blocking Method', type: 'Productivity', description: 'Schedule your day in focused time blocks to improve productivity', link: 'https://todoist.com/productivity-methods/time-blocking' },
        { title: 'Pomodoro Technique', type: 'Productivity', description: '25 min focused work + 5 min break cycles for better concentration', link: 'https://www.pomodorotechnique.com/' },
        { title: 'Mindfulness for ADHD', type: 'Meditation', description: 'Mindfulness practices specifically designed to improve ADHD focus', link: 'https://www.additudemag.com/mindfulness-meditation-for-adhd/' },
    ],
    'PTSD': [
        { title: 'Grounding Techniques', type: 'Exercise', description: 'Techniques to bring yourself back to the present moment', link: 'https://www.therapistaid.com/therapy-worksheet/grounding-techniques' },
        { title: 'Safe Place Visualization', type: 'Meditation', description: 'Create a mental safe space to reduce PTSD symptoms', link: 'https://www.verywellmind.com/safe-place-visualization-2584977' },
    ],
    'Stress': [
        { title: 'Journaling for Stress', type: 'Writing', description: 'Daily journaling to process stress and emotions effectively', link: 'https://www.urmc.rochester.edu/encyclopedia/content.aspx?ContentID=4552&ContentTypeID=1' },
        { title: 'Nature Walks', type: 'Exercise', description: '20 minute nature walk significantly reduces cortisol stress levels', link: 'https://www.nationalgeographic.com/travel/article/why-you-should-take-a-walk-in-nature' },
    ],
    'Bipolar': [
        { title: 'Mood Tracking', type: 'Tool', description: 'Track your daily mood to identify patterns and triggers', link: 'https://www.nami.org/Support-Education/Mental-Health-Education/NAMI-Peer-to-Peer' },
        { title: 'Sleep Routine for Bipolar', type: 'Lifestyle', description: 'Maintaining consistent sleep is critical for bipolar management', link: 'https://www.sleepfoundation.org/mental-health/bipolar-disorder-and-sleep' },
    ],
    'General': [
        { title: 'Daily Self Care Checklist', type: 'Lifestyle', description: 'Build a sustainable daily self-care routine for mental wellness', link: 'https://www.verywellmind.com/self-care-strategies-overall-stress-reduction-3144729' },
        { title: 'Gratitude Journal', type: 'Writing', description: 'Write 3 things you are grateful for daily to boost mood', link: 'https://greatergood.berkeley.edu/article/item/tips_for_keeping_a_gratitude_journal' },
        { title: 'Social Connection Guide', type: 'Lifestyle', description: 'Maintain meaningful social connections for better mental health', link: 'https://www.mentalhealth.org.uk/explore-mental-health/publications/relationships-mental-health' },
        { title: 'Mindful Breathing', type: 'Meditation', description: 'Simple breathing exercises to calm your mind anytime', link: 'https://www.mindful.org/how-to-meditate/' },
    ],
};

// ─── Helper: Calculate risk score ────────────────────────────
const calculateRiskScore = (moodEntries, latestChat) => {
    if (moodEntries.length === 0 && !latestChat) return 0;

    let score = 0;

    if (moodEntries.length > 0) {
        const avgMood = moodEntries.reduce((sum, m) => sum + m.moodScore, 0) / moodEntries.length;
        score += Math.round((10 - avgMood));
    }

    const recentMoods = moodEntries.slice(0, 3);
    const lowMoodCount = recentMoods.filter(m => m.moodScore <= 3).length;
    if (lowMoodCount >= 2) score += 2;
    else if (lowMoodCount === 1) score += 1;

    if (latestChat?.riskLevel === 'High') score += 3;
    else if (latestChat?.riskLevel === 'Medium') score += 1;

    if (latestChat?.escalatedToHuman) score += 2;

    return Math.min(Math.round(score / 1.5), 10);
};

// ─── Helper: Get risk category ────────────────────────────────
const getRiskCategory = (riskScore) => {
    if (riskScore >= 7) return 'High';
    if (riskScore >= 4) return 'Medium';
    return 'Low';
};

// ─── Helper: Get specializations ─────────────────────────────
const getSpecializations = (diagnosis, dominantMood) => {
    const specs = new Set();

    if (diagnosis) {
        const matched = Object.keys(DIAG_SPEC_MAP).find(k =>
            diagnosis.toLowerCase().includes(k.toLowerCase())
        );
        if (matched) specs.add(DIAG_SPEC_MAP[matched]);
    }

    const moodSpecMap = {
        'Anxious': 'Anxiety & Stress Management',
        'Depressed': 'Depression & Mood Disorders',
        'Sad': 'Depression & Mood Disorders',
        'Angry': 'Anger Management',
        'Stressed': 'Anxiety & Stress Management',
        'Terrible': 'Depression & Mood Disorders',
        'Low': 'Depression & Mood Disorders',
    };

    if (dominantMood && moodSpecMap[dominantMood]) {
        specs.add(moodSpecMap[dominantMood]);
    }

    if (specs.size === 0) {
        specs.add('General Mental Health');
        specs.add('Counseling');
    }

    return Array.from(specs);
};

// ─── Helper: Get resources ────────────────────────────────────
const getResources = (diagnosis) => {
    if (!diagnosis) return RESOURCES_MAP['General'];

    const matched = Object.keys(RESOURCES_MAP).find(k =>
        diagnosis.toLowerCase().includes(k.toLowerCase())
    );

    return matched
        ? [...RESOURCES_MAP[matched], ...RESOURCES_MAP['General']]
        : RESOURCES_MAP['General'];
};

// ─── 1. GET THERAPIST RECOMMENDATIONS ────────────────────────
const getTherapistRecommendations = async (req, res) => {
    try {
        const patientId = req.user._id;

        const moodEntries = await MoodEntry.find({ patientId })
            .sort({ timestamp: -1 })
            .limit(10);

        const latestChat = await Chatbot.findOne({ patientId })
            .sort({ createdAt: -1 });

        const averageMoodScore = moodEntries.length > 0
            ? moodEntries.reduce((sum, m) => sum + m.moodScore, 0) / moodEntries.length
            : 5;

        const moodCounts = {};
        moodEntries.forEach(m => {
            moodCounts[m.moodType] = (moodCounts[m.moodType] || 0) + 1;
        });
        const dominantMood = Object.keys(moodCounts).length > 0
            ? Object.keys(moodCounts).reduce((a, b) =>
                moodCounts[a] > moodCounts[b] ? a : b)
            : 'Neutral';

        const riskScore = calculateRiskScore(moodEntries, latestChat);
        const riskCategory = getRiskCategory(riskScore);

        const urgentHelp = riskScore >= 7 ||
            latestChat?.riskLevel === 'High' ||
            latestChat?.escalatedToHuman === true;

        const diagnosis = latestChat?.diagnosis || null;
        const severity = latestChat?.severity || null;
        const neededSpecializations = getSpecializations(diagnosis, dominantMood);

        // ✅ Get all available psychiatrists
        const psychiatrists = await Psychiatrist.find({
            $or: [
                { isAvailable: true },
                { isAvailable: { $exists: false } }
            ]
        }).select('name email specializations session_rate experience_years hospital languages avg_rating isAvailable');

        res.status(200).json({
            success: true,
            data: {
                patientAnalysis: {
                    averageMoodScore: parseFloat(averageMoodScore.toFixed(1)),
                    dominantMood,
                    riskScore,
                    riskCategory,
                    urgentHelp,
                    diagnosis,
                    severity
                },
                neededSpecializations,
                recommendedTherapists: psychiatrists,
                totalFound: psychiatrists.length
            }
        });

    } catch (error) {
        console.error('Recommendation error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── 2. GET RESOURCE RECOMMENDATIONS ─────────────────────────
const getResourceRecommendations = async (req, res) => {
    try {
        const { diagnosis } = req.params;
        const resources = getResources(diagnosis);

        res.status(200).json({
            success: true,
            data: {
                diagnosis,
                resources,
                totalFound: resources.length
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── 3. GET PATIENT TRIAGE SUMMARY ───────────────────────────
const getPatientSummary = async (req, res) => {
    try {
        const patientId = req.user._id;

        const moodEntries = await MoodEntry.find({ patientId })
            .sort({ timestamp: -1 })
            .limit(10);

        const latestChat = await Chatbot.findOne({ patientId })
            .sort({ createdAt: -1 });

        const averageMoodScore = moodEntries.length > 0
            ? moodEntries.reduce((sum, m) => sum + m.moodScore, 0) / moodEntries.length
            : 5;

        const moodCounts = {};
        moodEntries.forEach(m => {
            moodCounts[m.moodType] = (moodCounts[m.moodType] || 0) + 1;
        });
        const dominantMood = Object.keys(moodCounts).length > 0
            ? Object.keys(moodCounts).reduce((a, b) =>
                moodCounts[a] > moodCounts[b] ? a : b)
            : 'Neutral';

        const riskScore = calculateRiskScore(moodEntries, latestChat);
        const riskCategory = getRiskCategory(riskScore);

        const urgentHelp = riskScore >= 7 ||
            latestChat?.riskLevel === 'High' ||
            latestChat?.escalatedToHuman === true;

        const diagnosis = latestChat?.diagnosis || null;
        const severity = latestChat?.severity || null;
        const recommendedSpecializations = getSpecializations(diagnosis, dominantMood);
        const rawResources = getResources(diagnosis).slice(0, 5);

        // ✅ Save triage WITHOUT recommendedResources to avoid cast error
        const triageSummary = await TriageSummary.findOneAndUpdate(
            { patientId },
            {
                patientId,
                riskLevel: riskScore,
                riskCategory,
                averageMoodScore: parseFloat(averageMoodScore.toFixed(1)),
                dominantMood,
                moodEntryCount: moodEntries.length,
                diagnosis,
                severity,
                diagnosisConfidence: latestChat?.diagnosisConfidence || null,
                urgentHelp,
                urgentConfirm: urgentHelp,
                triggerEscalation: urgentHelp,
                showNotification: urgentHelp,
                aiNotes: diagnosis
                    ? `Patient shows signs of ${diagnosis} with ${severity || 'unknown'} severity. Average mood score: ${averageMoodScore.toFixed(1)}/10.`
                    : `No specific diagnosis detected. Average mood score: ${averageMoodScore.toFixed(1)}/10.`,
                recommendedSpecializations,
                lastUpdated: new Date()
            },
            { upsert: true, new: true }
        );

        res.status(200).json({
            success: true,
            data: {
                patientAnalysis: {
                    averageMoodScore: parseFloat(averageMoodScore.toFixed(1)),
                    dominantMood,
                    riskScore,
                    riskCategory,
                    urgentHelp,
                    diagnosis,
                    severity,
                    moodEntryCount: moodEntries.length
                },
                recommendedSpecializations,
                // ✅ Resources returned fresh — not from DB
                recommendedResources: rawResources,
                recentMoods: moodEntries.slice(0, 5).map(m => ({
                    moodScore: m.moodScore,
                    moodType: m.moodType,
                    riskLevel: m.aiAnalysis?.riskLevel || 'Low',
                    timestamp: m.timestamp
                })),
                latestChat: latestChat ? {
                    riskLevel: latestChat.riskLevel,
                    diagnosis: latestChat.diagnosis,
                    severity: latestChat.severity,
                    escalatedToHuman: latestChat.escalatedToHuman,
                    lastMessage: latestChat.messages?.slice(-1)[0]?.message
                } : null,
                triageSummaryId: triageSummary._id,
                aiNotes: triageSummary.aiNotes
            }
        });

    } catch (error) {
        console.error('Triage error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── 4. GET PSYCHOLOGIST VIEW OF PATIENT ─────────────────────
const getPsychologistPatientSummary = async (req, res) => {
    try {
        const { patientId } = req.params;

        // ✅ Include dataShareConsent in query
        const patient = await Patient.findById(patientId)
            .select('name email phone_no createdAt dataShareConsent');

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: 'Patient not found'
            });
        }

        // ✅ Check consent before sharing data
        if (!patient.dataShareConsent) {
            return res.status(403).json({
                success: false,
                consentRequired: true,
                message: 'Patient has not consented to share their data with psychiatrists'
            });
        }

        const triageSummary = await TriageSummary.findOne({ patientId });

        const moodEntries = await MoodEntry.find({ patientId })
            .sort({ timestamp: -1 })
            .limit(10);

        const chatHistory = await Chatbot.find({ patientId })
            .sort({ createdAt: -1 })
            .limit(5)
            .select('riskLevel diagnosis severity messages createdAt language');

        const averageMoodScore = moodEntries.length > 0
            ? moodEntries.reduce((sum, m) => sum + m.moodScore, 0) / moodEntries.length
            : 5;

        const moodTrend = moodEntries.length >= 2
            ? moodEntries[0].moodScore > moodEntries[moodEntries.length - 1].moodScore
                ? 'Improving'
                : moodEntries[0].moodScore < moodEntries[moodEntries.length - 1].moodScore
                    ? 'Declining'
                    : 'Stable'
            : 'Insufficient data';

        const latestChat = chatHistory[0];
        const diagnosis = triageSummary?.diagnosis || latestChat?.diagnosis || null;
        const severity = triageSummary?.severity || latestChat?.severity || null;

        const freshRiskScore = calculateRiskScore(moodEntries, latestChat);
        const freshRiskCategory = getRiskCategory(freshRiskScore);

        // ✅ Get fresh resources for this patient
        const resources = getResources(diagnosis).slice(0, 3);

        res.status(200).json({
            success: true,
            data: {
                patient: {
                    id: patient._id,
                    name: patient.name,
                    email: patient.email,
                    phone_no: patient.phone_no,
                    memberSince: patient.createdAt
                },
                riskAssessment: {
                    riskScore: freshRiskScore,
                    riskCategory: freshRiskCategory,
                    urgentHelp: freshRiskScore >= 7 ||
                        latestChat?.escalatedToHuman || false,
                    lastUpdated: triageSummary?.lastUpdated || null
                },
                diagnosis: {
                    label: diagnosis,
                    severity,
                    confidence: triageSummary?.diagnosisConfidence || null,
                    aiNotes: triageSummary?.aiNotes || 'No diagnosis yet'
                },
                moodAnalysis: {
                    averageMoodScore: parseFloat(averageMoodScore.toFixed(1)),
                    dominantMood: triageSummary?.dominantMood || 'Neutral',
                    moodTrend,
                    totalEntries: moodEntries.length,
                    recentMoods: moodEntries.slice(0, 5).map(m => ({
                        score: m.moodScore,
                        type: m.moodType,
                        risk: m.aiAnalysis?.riskLevel || 'Low',
                        date: m.timestamp
                    }))
                },
                chatInsights: chatHistory.map(chat => ({
                    riskLevel: chat.riskLevel,
                    diagnosis: chat.diagnosis,
                    severity: chat.severity,
                    lastMessage: chat.messages?.slice(-1)[0]?.message,
                    date: chat.createdAt
                })),
                recommendations: {
                    specializations: triageSummary?.recommendedSpecializations || [],
                    // ✅ Fresh resources — not from DB
                    resources
                }
            }
        });

    } catch (error) {
        console.error('Psychologist summary error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    getTherapistRecommendations,
    getResourceRecommendations,
    getPatientSummary,
    getPsychologistPatientSummary
};