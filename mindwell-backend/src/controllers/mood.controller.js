// src/controllers/mood.controller.js
const MoodEntry = require('../models/MoodEntry');

// ─── Analyze Mood ──────────────────────────────────────────────
const analyzeMood = (moodScore, moodType, notes) => {
  let sentiment = 'Neutral';
  let riskLevel = 'Low';
  let suggestion = '';

  if (moodScore >= 7) {
    sentiment = 'Positive';
  } else if (moodScore <= 4) {
    sentiment = 'Negative';
  } else {
    sentiment = 'Neutral';
  }

  if (moodScore <= 3 || moodType === 'Depressed' || moodType === 'Anxious') {
    riskLevel = 'High';
  } else if (moodScore <= 5 || moodType === 'Sad' || moodType === 'Stressed') {
    riskLevel = 'Medium';
  } else {
    riskLevel = 'Low';
  }

  if (riskLevel === 'High') {
    suggestion = 'Your mood indicates you may need professional support. Consider booking a session with a therapist.';
  } else if (riskLevel === 'Medium') {
    suggestion = 'Try some relaxation techniques like deep breathing or meditation. If this continues, consider talking to a therapist.';
  } else {
    suggestion = 'You are doing well! Keep up your positive activities and self-care routine.';
  }

  return { sentiment, riskLevel, suggestion };
};

// ─── LOG MOOD ──────────────────────────────────────────────────
exports.logMood = async (req, res) => {
  try {
    const { moodScore, moodType, notes, activities } = req.body;

    if (!moodScore || !moodType) {
      return res.status(400).json({
        success: false,
        message: 'Please provide mood score and mood type'
      });
    }

    const aiAnalysis = analyzeMood(moodScore, moodType, notes);

    const moodEntry = await MoodEntry.create({
      patientId: req.user.id,
      moodScore,
      moodType,
      notes,
      activities,
      aiAnalysis
    });

    res.status(201).json({
      success: true,
      message: 'Mood logged successfully',
      data: moodEntry,
      aiAnalysis
    });

  } catch (error) {
    console.error('Log Mood Error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET ALL MOODS ─────────────────────────────────────────────
exports.getAllMoods = async (req, res) => {
  try {
    const moods = await MoodEntry.find({
      patientId: req.user.id
    }).sort({ timestamp: -1 });

    res.status(200).json({
      success: true,
      count: moods.length,
      data: moods
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET TODAY'S MOOD ──────────────────────────────────────────
exports.getTodayMood = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const moods = await MoodEntry.find({
      patientId: req.user.id,
      timestamp: { $gte: today, $lt: tomorrow }
    });

    res.status(200).json({
      success: true,
      count: moods.length,
      data: moods
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET WEEKLY SUMMARY ────────────────────────────────────────
exports.getWeeklySummary = async (req, res) => {
  try {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const moods = await MoodEntry.find({
      patientId: req.user.id,
      timestamp: { $gte: sevenDaysAgo }
    }).sort({ timestamp: 1 });

    if (moods.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No mood entries found for this week',
        data: []
      });
    }

    const avgScore = moods.reduce(
      (sum, entry) => sum + entry.moodScore, 0
    ) / moods.length;

    const moodCount = {};
    moods.forEach(entry => {
      moodCount[entry.moodType] = (moodCount[entry.moodType] || 0) + 1;
    });

    const riskCount = { Low: 0, Medium: 0, High: 0 };
    moods.forEach(entry => {
      riskCount[entry.aiAnalysis.riskLevel]++;
    });

    res.status(200).json({
      success: true,
      data: {
        totalEntries: moods.length,
        averageMoodScore: avgScore.toFixed(1),
        moodBreakdown: moodCount,
        riskBreakdown: riskCount,
        entries: moods
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET MONTHLY SUMMARY ──────────────────────────────────────
exports.getMonthlySummary = async (req, res) => {
  try {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const moods = await MoodEntry.find({
      patientId: req.user.id,
      timestamp: { $gte: thirtyDaysAgo }
    }).sort({ timestamp: 1 });

    if (moods.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No mood entries found for this month',
        data: []
      });
    }

    const avgScore = moods.reduce(
      (sum, entry) => sum + entry.moodScore, 0
    ) / moods.length;

    const moodCount = {};
    moods.forEach(entry => {
      moodCount[entry.moodType] = (moodCount[entry.moodType] || 0) + 1;
    });

    const riskCount = { Low: 0, Medium: 0, High: 0 };
    moods.forEach(entry => {
      riskCount[entry.aiAnalysis.riskLevel]++;
    });

    // Weekly breakdown (4 weeks)
    const weeklyBreakdown = [1, 2, 3, 4].map(week => {
      const weekStart = new Date(thirtyDaysAgo);
      weekStart.setDate(weekStart.getDate() + (week - 1) * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const weekEntries = moods.filter(entry =>
        entry.timestamp >= weekStart && entry.timestamp < weekEnd
      );

      const weekAvg = weekEntries.length > 0
        ? weekEntries.reduce((sum, e) => sum + e.moodScore, 0) / weekEntries.length
        : null;

      return {
        week: `Week ${week}`,
        totalEntries: weekEntries.length,
        averageMoodScore: weekAvg ? weekAvg.toFixed(1) : 'No data'
      };
    });

    res.status(200).json({
      success: true,
      data: {
        totalEntries: moods.length,
        averageMoodScore: avgScore.toFixed(1),
        moodBreakdown: moodCount,
        riskBreakdown: riskCount,
        weeklyBreakdown,
        entries: moods
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── DELETE MOOD ENTRY ────────────────────────────────────────
exports.deleteMoodEntry = async (req, res) => {
  try {
    const mood = await MoodEntry.findById(req.params.id);

    if (!mood) {
      return res.status(404).json({
        success: false,
        message: 'Mood entry not found'
      });
    }

    if (mood.patientId.toString() !== req.user.id.toString()) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to delete this entry'
      });
    }

    await MoodEntry.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Mood entry deleted'
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};