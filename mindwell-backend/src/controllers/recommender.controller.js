// src/controllers/recommender.controller.js
const MoodEntry = require('../models/MoodEntry');
const Chatbot = require('../models/Chatbot');
const Psychiatrist = require('../models/Psychiatrist');
const Session = require('../models/Session');
const TriageSummary = require('../models/TriageSummary');

// ─── Content Based Resources ──────────────────────
const selfHelpResources = {
  Anxiety: [
    {
      title: 'Box Breathing Exercise',
      type: 'Exercise',
      description: 'A breathing technique to calm anxiety',
      link: 'https://mindwell.com/resources/box-breathing',
      duration: '5 min'
    },
    {
      title: 'Managing Anxiety Guide',
      type: 'Article',
      description: 'Evidence based techniques for anxiety',
      link: 'https://mindwell.com/resources/anxiety-guide',
      duration: '10 min'
    },
    {
      title: '5-4-3-2-1 Grounding Technique',
      type: 'Exercise',
      description: 'Sensory grounding for panic attacks',
      link: 'https://mindwell.com/resources/grounding',
      duration: '8 min'
    }
  ],
  Depression: [
    {
      title: 'Behavioral Activation Guide',
      type: 'Article',
      description: 'CBT technique for depression',
      link: 'https://mindwell.com/resources/behavioral-activation',
      duration: '12 min'
    },
    {
      title: 'Daily Mood Journal Template',
      type: 'Tool',
      description: 'Track your mood daily',
      link: 'https://mindwell.com/resources/mood-journal',
      duration: '10 min'
    },
    {
      title: 'Positive Activity Scheduling',
      type: 'Exercise',
      description: 'Schedule activities that bring joy',
      link: 'https://mindwell.com/resources/activity-scheduling',
      duration: '15 min'
    }
  ],
  Stress: [
    {
      title: 'Progressive Muscle Relaxation',
      type: 'Exercise',
      description: 'Reduce physical tension from stress',
      link: 'https://mindwell.com/resources/pmr',
      duration: '10 min'
    },
    {
      title: 'Time Management Guide',
      type: 'Article',
      description: 'Manage workload and reduce stress',
      link: 'https://mindwell.com/resources/time-management',
      duration: '15 min'
    },
    {
      title: 'Mindfulness Meditation',
      type: 'Exercise',
      description: '10 minute mindfulness practice',
      link: 'https://mindwell.com/resources/mindfulness',
      duration: '10 min'
    }
  ],
  General: [
    {
      title: '4-7-8 Breathing Exercise',
      type: 'Exercise',
      description: 'Use when anxiety spikes',
      link: 'https://mindwell.com/resources/box-breathing',
      duration: '5 min'
    },
    {
      title: 'Thought Reframing Guide',
      type: 'Article',
      description: 'Challenge repeated negative thoughts',
      link: 'https://mindwell.com/resources/thought-reframing',
      duration: '10 min'
    },
    {
      title: 'Sleep Wind-down Routine',
      type: 'Exercise',
      description: 'Build a calmer bedtime routine',
      link: 'https://mindwell.com/resources/sleep-routine',
      duration: '8 min'
    },
    {
      title: 'Stress Journal Template',
      type: 'Tool',
      description: 'Separate triggers from controllable next steps',
      link: 'https://mindwell.com/resources/stress-journal',
      duration: '12 min'
    }
  ]
};

// ─── Analyze Patient Data ─────────────────────────
const analyzePatientData = async (patientId) => {
  // Get last 7 days mood entries
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const moodEntries = await MoodEntry.find({
    patientId,
    timestamp: { $gte: sevenDaysAgo }
  }).sort({ timestamp: -1 });

  // Get recent chat history
  const chatHistory = await Chatbot.find({
    patientId
  }).sort({ createdAt: -1 }).limit(5);

  // Calculate average mood score
  const avgMoodScore = moodEntries.length > 0
    ? moodEntries.reduce(
        (sum, e) => sum + e.moodScore, 0
      ) / moodEntries.length
    : 5;

  // Count mood types
  const moodCounts = {};
  moodEntries.forEach(entry => {
    moodCounts[entry.moodType] =
      (moodCounts[entry.moodType] || 0) + 1;
  });

  // Find dominant mood
  const dominantMood = Object.keys(moodCounts).reduce(
    (a, b) => moodCounts[a] > moodCounts[b] ? a : b,
    'Neutral'
  );

  // Count high risk entries
  const highRiskCount = moodEntries.filter(
    e => e.aiAnalysis.riskLevel === 'High'
  ).length;

  // Check chat risk levels
  const chatHighRisk = chatHistory.filter(
    c => c.riskLevel === 'High'
  ).length;

  // Overall risk score (0-10)
  let riskScore = 0;
  if (avgMoodScore <= 3) riskScore += 4;
  else if (avgMoodScore <= 5) riskScore += 2;
  if (highRiskCount >= 3) riskScore += 3;
  else if (highRiskCount >= 1) riskScore += 1;
  if (chatHighRisk >= 2) riskScore += 3;
  else if (chatHighRisk >= 1) riskScore += 1;

  return {
    avgMoodScore,
    dominantMood,
    moodCounts,
    highRiskCount,
    chatHighRisk,
    riskScore,
    moodEntries,
    chatHistory
  };
};

// ─── GET THERAPIST RECOMMENDATIONS ────────────────
const getTherapistRecommendations = async (req, res) => {
  try {
    const patientId = req.user._id;

    // Analyze patient data
    const analysis = await analyzePatientData(patientId);

    // Determine needed specialization
    let neededSpecializations = [];

    if (
      analysis.dominantMood === 'Anxious' ||
      analysis.dominantMood === 'Stressed'
    ) {
      neededSpecializations = [
        'Anxiety',
        'Stress Management',
        'CBT'
      ];
    } else if (
      analysis.dominantMood === 'Depressed' ||
      analysis.dominantMood === 'Sad'
    ) {
      neededSpecializations = [
        'Depression',
        'Mood Disorders',
        'CBT'
      ];
    } else if (analysis.dominantMood === 'Angry') {
      neededSpecializations = [
        'Anger Management',
        'Behavioral Therapy'
      ];
    } else {
      neededSpecializations = [
        'General Mental Health',
        'Counseling'
      ];
    }

    // Find therapists matching specialization
    const contentBasedTherapists = await Psychiatrist.find({
      status: 'active',
      isAvailable: true,
      specializations: {
        $in: neededSpecializations.map(s => new RegExp(s, 'i'))
      }
    })
      .select('-password')
      .limit(5);

    // Get highly rated therapists from sessions
    const similarPatientSessions = await Session.find({
      status: 'Completed',
      patientRating: { $gte: 4 }
    }).populate('psychiatristId', 'name specializations avg_rating session_rate isAvailable');

    // Get unique therapists
    const collaborativeTherapists = similarPatientSessions
      .map(s => s.psychiatristId)
      .filter(t =>
        t &&
        t.status === 'active' &&
        t.isAvailable
      )
      .filter((t, index, self) =>
        index === self.findIndex(
          x => x._id.toString() === t._id.toString()
        )
      )
      .slice(0, 5);

    // Merge and deduplicate
    const allTherapists = [
      ...contentBasedTherapists,
      ...collaborativeTherapists
    ];

    const uniqueTherapists = allTherapists.filter(
      (t, index, self) =>
        index === self.findIndex(
          x => x._id.toString() === t._id.toString()
        )
    );

    // Sort by rating
    uniqueTherapists.sort(
      (a, b) => (b.avg_rating || 0) - (a.avg_rating || 0)
    );

    // Save to triage summary
    await TriageSummary.findOneAndUpdate(
      { patientId },
      {
        patientId,
        riskLevel: analysis.riskScore,
        urgentConfirm: analysis.riskScore >= 7,
        recommendedSpecializations: neededSpecializations,
        recommendedTherapists: uniqueTherapists.map(
          t => t._id
        )
      },
      { upsert: true, new: true }
    );

    res.status(200).json({
      success: true,
      data: {
        patientAnalysis: {
          averageMoodScore: analysis.avgMoodScore.toFixed(1),
          dominantMood: analysis.dominantMood,
          riskScore: analysis.riskScore,
          urgentHelp: analysis.riskScore >= 7
        },
        neededSpecializations,
        recommendedTherapists: uniqueTherapists,
        totalFound: uniqueTherapists.length
      }
    });

  } catch (error) {
    console.error('Recommender Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ─── GET RESOURCE RECOMMENDATIONS ─────────────────
const getResourceRecommendations = async (req, res) => {
  try {
    const patientId = req.user._id;
    const { diagnosis } = req.params;

    // Analyze patient data for better recommendations
    let analysis = null;
    try {
      analysis = await analyzePatientData(patientId);
    } catch (e) {
      console.warn('Could not analyze patient data:', e.message);
    }

    let resources = [];
    let category = diagnosis || 'General';

    // Select resources based on diagnosis or mood
    if (category === 'Anxiety' || 
        (analysis && (analysis.dominantMood === 'Anxious' || analysis.dominantMood === 'Stressed'))) {
      resources = selfHelpResources.Anxiety;
    } else if (category === 'Depression' || 
               (analysis && (analysis.dominantMood === 'Depressed' || analysis.dominantMood === 'Sad'))) {
      resources = selfHelpResources.Depression;
    } else if (category === 'Stress' || 
               (analysis && analysis.dominantMood === 'Stressed')) {
      resources = selfHelpResources.Stress;
    } else {
      resources = selfHelpResources.General;
    }

    // Add urgent resources if high risk
    if (analysis && analysis.riskScore >= 7) {
      resources.unshift({
        title: '🆘 Crisis Support',
        type: 'Emergency',
        description: 'Immediate mental health crisis support',
        link: 'tel:0317-4288665',
        duration: '24/7'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        category,
        resources: resources,
        totalResources: resources.length,
        patientRisk: analysis ? analysis.riskScore : null
      }
    });

  } catch (error) {
    console.error('Resource recommendations error:', error);
    // Return default resources on error
    res.status(200).json({
      success: true,
      data: {
        category: 'General',
        resources: selfHelpResources.General,
        totalResources: selfHelpResources.General.length
      }
    });
  }
};

// ─── GET FULL PATIENT SUMMARY ─────────────────────
const getPatientSummary = async (req, res) => {
  try {
    const patientId = req.user._id;

    // Analyze patient data
    const analysis = await analyzePatientData(patientId);

    // Get triage summary
    const triageSummary = await TriageSummary.findOne({
      patientId
    });

    res.status(200).json({
      success: true,
      data: {
        summary: {
          averageMoodScore: analysis.avgMoodScore.toFixed(1),
          dominantMood: analysis.dominantMood,
          moodBreakdown: analysis.moodCounts,
          riskScore: analysis.riskScore,
          urgentHelp: analysis.riskScore >= 7,
          totalMoodEntries: analysis.moodEntries.length,
          totalChats: analysis.chatHistory.length
        },
        triage: triageSummary,
        recentMoods: analysis.moodEntries.slice(0, 5),
        recommendation: analysis.riskScore >= 7
          ? 'Immediate professional help recommended'
          : analysis.riskScore >= 4
          ? 'Consider booking a therapy session'
          : 'Continue with self-care routine'
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ─── GET PSYCHOLOGIST PATIENT SUMMARY ─────────────
const getPsychologistPatientSummary = async (req, res) => {
  try {
    const { patientId } = req.params;

    // Analyze patient data
    const analysis = await analyzePatientData(patientId);

    // Get triage summary
    const triageSummary = await TriageSummary.findOne({
      patientId
    });

    res.status(200).json({
      success: true,
      data: {
        summary: {
          averageMoodScore: analysis.avgMoodScore.toFixed(1),
          dominantMood: analysis.dominantMood,
          moodBreakdown: analysis.moodCounts,
          riskScore: analysis.riskScore,
          urgentHelp: analysis.riskScore >= 7
        },
        recentMoods: analysis.moodEntries.slice(0, 7),
        recentChats: analysis.chatHistory.slice(0, 3),
        triage: triageSummary
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ─── EXPORT ALL FUNCTIONS ──────────────────────────
module.exports = {
  getTherapistRecommendations,
  getResourceRecommendations,
  getPatientSummary,
  getPsychologistPatientSummary
};