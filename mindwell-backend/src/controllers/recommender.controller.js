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
      link: 'https://mindwell.com/resources/box-breathing'
    },
    {
      title: 'Managing Anxiety Guide',
      type: 'Article',
      description: 'Evidence based techniques for anxiety',
      link: 'https://mindwell.com/resources/anxiety-guide'
    },
    {
      title: '5-4-3-2-1 Grounding Technique',
      type: 'Exercise',
      description: 'Sensory grounding for panic attacks',
      link: 'https://mindwell.com/resources/grounding'
    }
  ],
  Depression: [
    {
      title: 'Behavioral Activation Guide',
      type: 'Article',
      description: 'CBT technique for depression',
      link: 'https://mindwell.com/resources/behavioral-activation'
    },
    {
      title: 'Daily Mood Journal Template',
      type: 'Tool',
      description: 'Track your mood daily',
      link: 'https://mindwell.com/resources/mood-journal'
    },
    {
      title: 'Positive Activity Scheduling',
      type: 'Exercise',
      description: 'Schedule activities that bring joy',
      link: 'https://mindwell.com/resources/activity-scheduling'
    }
  ],
  Stress: [
    {
      title: 'Progressive Muscle Relaxation',
      type: 'Exercise',
      description: 'Reduce physical tension from stress',
      link: 'https://mindwell.com/resources/pmr'
    },
    {
      title: 'Time Management Guide',
      type: 'Article',
      description: 'Manage workload and reduce stress',
      link: 'https://mindwell.com/resources/time-management'
    },
    {
      title: 'Mindfulness Meditation',
      type: 'Exercise',
      description: '10 minute mindfulness practice',
      link: 'https://mindwell.com/resources/mindfulness'
    }
  ],
  General: [
    {
      title: 'Mental Wellness Guide',
      type: 'Article',
      description: 'General mental health tips',
      link: 'https://mindwell.com/resources/wellness-guide'
    },
    {
      title: 'Sleep Hygiene Tips',
      type: 'Article',
      description: 'Improve sleep for better mental health',
      link: 'https://mindwell.com/resources/sleep'
    },
    {
      title: 'Exercise for Mental Health',
      type: 'Article',
      description: 'How exercise improves mood',
      link: 'https://mindwell.com/resources/exercise'
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

    // ─── Content Based Filtering ──────────────────
    // Find therapists matching specialization
    const contentBasedTherapists = await Psychiatrist.find({
      accountStatus: 'Authorized',
      isAvailable: true,
      specialization: {
        $regex: neededSpecializations[0],
        $options: 'i'
      }
    })
      .select('-password -twoFactorSecret')
      .limit(5);

    // ─── Collaborative Filtering ──────────────────
    // Find therapists that helped similar patients
    const similarPatientSessions = await Session.find({
      status: 'Completed',
      patientRating: { $gte: 4 }
    }).populate('psychiatristId', 'name specialization rating sessionRate isAvailable accountStatus');

    // Get highly rated therapists
    const collaborativeTherapists = similarPatientSessions
      .map(s => s.psychiatristId)
      .filter(t =>
        t &&
        t.accountStatus === 'Authorized' &&
        t.isAvailable
      )
      .filter((t, index, self) =>
        index === self.findIndex(
          x => x._id.toString() === t._id.toString()
        )
      )
      .slice(0, 5);

    // ─── Hybrid Merge ─────────────────────────────
    const allTherapists = [
      ...contentBasedTherapists,
      ...collaborativeTherapists
    ];

    // Remove duplicates
    const uniqueTherapists = allTherapists.filter(
      (t, index, self) =>
        index === self.findIndex(
          x => x._id.toString() === t._id.toString()
        )
    );

    // Sort by rating
    uniqueTherapists.sort(
      (a, b) => b.rating - a.rating
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

    // Analyze patient data
    const analysis = await analyzePatientData(patientId);

    let resources = [];
    let category = 'General';

    // Content based resource selection
    if (
      analysis.dominantMood === 'Anxious' ||
      analysis.dominantMood === 'Stressed'
    ) {
      category = analysis.dominantMood === 'Anxious'
        ? 'Anxiety'
        : 'Stress';
      resources = [
        ...selfHelpResources[category],
        ...selfHelpResources.General
      ];
    } else if (
      analysis.dominantMood === 'Depressed' ||
      analysis.dominantMood === 'Sad'
    ) {
      category = 'Depression';
      resources = [
        ...selfHelpResources.Depression,
        ...selfHelpResources.General
      ];
    } else {
      resources = selfHelpResources.General;
    }

    // Add urgent resources if high risk
    if (analysis.riskScore >= 7) {
      resources.unshift({
        title: '🆘 Crisis Support',
        type: 'Emergency',
        description: 'Immediate mental health crisis support',
        link: 'tel:0317-4288665'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        category,
        dominantMood: analysis.dominantMood,
        riskScore: analysis.riskScore,
        resources,
        totalResources: resources.length
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
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

module.exports = {
  getTherapistRecommendations,
  getResourceRecommendations,
  getPatientSummary,
  getPsychologistPatientSummary
};