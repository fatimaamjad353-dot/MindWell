// src/controllers/session.controller.js
const Session = require('../models/Session');
const Patient = require('../models/Patient');
const Psychiatrist = require('../models/Psychiatrist');
const Payment = require('../models/Payment');

// ─── Book a session ─────────────────────────────────────────────
exports.bookSession = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      psychiatristId,
      dateTime,
      sessionType,
      agreedRate,
      notes,
      bookingSource,
    } = req.body;

    console.log('📝 Booking session received:', { 
      psychiatristId, 
      dateTime, 
      sessionType, 
      agreedRate,
      userId 
    });

    // ─── Validation ──────────────────────────────────────────────
    if (!psychiatristId) {
      return res.status(400).json({
        success: false,
        message: 'Psychiatrist ID is required',
      });
    }

    if (!dateTime) {
      return res.status(400).json({
        success: false,
        message: 'Date and time are required',
      });
    }

    if (!sessionType) {
      return res.status(400).json({
        success: false,
        message: 'Session type is required',
      });
    }

    if (!agreedRate) {
      return res.status(400).json({
        success: false,
        message: 'Session rate is required',
      });
    }

    // ─── Check if psychiatrist exists ────────────────────────────
    const psychiatrist = await Psychiatrist.findById(psychiatristId);
    if (!psychiatrist) {
      return res.status(404).json({
        success: false,
        message: 'Psychiatrist not found',
      });
    }

    // ─── Normalize session type (capitalize first letter) ────────
    const normalizedSessionType = sessionType.charAt(0).toUpperCase() + sessionType.slice(1).toLowerCase();
    
    const validSessionTypes = ['Audio', 'Video', 'Text'];
    if (!validSessionTypes.includes(normalizedSessionType)) {
      return res.status(400).json({
        success: false,
        message: `Session type must be one of: ${validSessionTypes.join(', ')}`,
      });
    }

    // ─── Normalize booking source ────────────────────────────────
    const normalizedSource = bookingSource === 'AI_Recommended' ? 'AI_Recommended' : 'Manual';

    // ─── Create session with correct field names ─────────────────
    const sessionData = {
      patientId: userId,
      psychiatristId: psychiatristId,
      dateTime: new Date(dateTime),
      sessionType: normalizedSessionType,
      agreedRate: agreedRate,
      notes: notes || '',
      bookingSource: normalizedSource,
      status: 'Pending',
      isPaid: false,
    };

    console.log('📝 Creating session with data:', sessionData);

    const session = new Session(sessionData);
    await session.save();

    // ─── Populate and return ──────────────────────────────────────
    const populatedSession = await Session.findById(session._id)
      .populate('patientId', 'name email')
      .populate('psychiatristId', 'name email specializations');

    res.status(201).json({
      success: true,
      message: 'Session booked successfully',
      data: populatedSession,
    });

  } catch (error) {
    console.error('❌ Book session error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─── Get my sessions ────────────────────────────────────────────
exports.getMySessions = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    let query = {};
    if (role === 'patient') {
      query.patientId = userId;
    } else if (role === 'psychiatrist') {
      query.psychiatristId = userId;
    }

    const sessions = await Session.find(query)
      .sort({ dateTime: -1 })
      .populate('patientId', 'name email')
      .populate('psychiatristId', 'name email specializations');

    res.json({
      success: true,
      count: sessions.length,
      data: sessions,
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─── Get a specific session ─────────────────────────────────────
exports.getSession = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const session = await Session.findById(id)
      .populate('patientId', 'name email profileImage')
      .populate('psychiatristId', 'name email specializations');

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    if (
      session.patientId._id.toString() !== userId &&
      session.psychiatristId._id.toString() !== userId &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to view this session',
      });
    }

    res.json({
      success: true,
      data: session,
    });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─── Cancel a session ──────────────────────────────────────────
exports.cancelSession = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const session = await Session.findById(id);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    if (session.patientId.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to cancel this session',
      });
    }

    if (session.status === 'Completed' || session.status === 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Session cannot be cancelled',
      });
    }

    session.status = 'Cancelled';
    await session.save();

    res.json({
      success: true,
      message: 'Session cancelled successfully',
    });
  } catch (error) {
    console.error('Cancel session error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─── Rate a session ────────────────────────────────────────────
exports.rateSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, feedback } = req.body;
    const userId = req.user.id;

    const session = await Session.findById(id);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    if (session.patientId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to rate this session',
      });
    }

    if (session.status !== 'Completed') {
      return res.status(400).json({
        success: false,
        message: 'Session must be completed to rate',
      });
    }

    session.patientRating = rating || 5;
    session.patientFeedback = feedback || '';
    await session.save();

    res.json({
      success: true,
      message: 'Session rated successfully',
      data: {
        rating: session.patientRating,
        feedback: session.patientFeedback,
      },
    });
  } catch (error) {
    console.error('Rate session error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─── Search therapists ─────────────────────────────────────────
exports.searchTherapists = async (req, res) => {
  try {
    const { specialization, diagnosis, language, type, available } = req.query;

    console.log('🔍 Searching therapists with:', { specialization, diagnosis });

    let query = { 
      status: 'active',
      isActive: true,
    };

    const searchTerm = specialization || diagnosis;
    if (searchTerm) {
      query.specializations = { 
        $in: [new RegExp(searchTerm, 'i')]
      };
    }

    if (language) {
      query.languages = { $in: [language] };
    }

    if (available === 'true') {
      query.isAvailable = true;
    }

    const therapists = await Psychiatrist.find(query)
      .select('name email specializations experience_years session_rate languages session_types avg_rating total_patients isAvailable contact hospital');

    res.json({
      success: true,
      count: therapists.length,
      data: therapists,
    });
  } catch (error) {
    console.error('Search therapists error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─── Get psychiatrist availability ─────────────────────────────
exports.getAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const { days = 7 } = req.query;

    const psychiatrist = await Psychiatrist.findById(id);
    if (!psychiatrist) {
      return res.status(404).json({
        success: false,
        message: 'Psychiatrist not found',
      });
    }

    const availability = {};
    const today = new Date();
    const workingHours = { start: 9, end: 17 };

    for (let i = 0; i < Math.min(days, 30); i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const dayOfWeek = date.getDay();

      if (dayOfWeek === 0 || dayOfWeek === 6) {
        availability[dateStr] = [];
        continue;
      }

      const slots = [];
      for (let hour = workingHours.start; hour < workingHours.end; hour++) {
        slots.push(`${String(hour).padStart(2, '0')}:00`);
        if (hour < workingHours.end - 1) {
          slots.push(`${String(hour).padStart(2, '0')}:30`);
        }
      }
      availability[dateStr] = slots;
    }

    res.json({
      success: true,
      data: availability,
    });
  } catch (error) {
    console.error('Get availability error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ─── Get psychiatrist profile ─────────────────────────────────
exports.getPsychiatristProfile = async (req, res) => {
  try {
    const { id } = req.params;

    const psychiatrist = await Psychiatrist.findById(id)
      .select('name email specializations experience_years session_rate languages session_types avg_rating total_patients isAvailable contact hospital');

    if (!psychiatrist) {
      return res.status(404).json({
        success: false,
        message: 'Psychiatrist not found',
      });
    }

    res.json({
      success: true,
      data: psychiatrist,
    });
  } catch (error) {
    console.error('Get psychiatrist profile error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};