// src/controllers/session.controller.js
const Session = require('../models/Session');
const Patient = require('../models/Patient');
const Psychiatrist = require('../models/Psychiatrist');
const Payment = require('../models/Payment');

/**
 * Book a session
 * POST /api/sessions/book
 */
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

    if (!psychiatristId) {
      return res.status(400).json({
        success: false,
        message: 'Psychiatrist ID is required',
      });
    }

    const psychiatrist = await Psychiatrist.findById(psychiatristId);
    if (!psychiatrist) {
      return res.status(404).json({
        success: false,
        message: 'Psychiatrist not found',
      });
    }

    let sessionDate = dateTime || new Date();
    let sessionTime = '00:00';

    if (dateTime) {
      const dt = new Date(dateTime);
      if (!isNaN(dt.getTime())) {
        sessionDate = dt;
        sessionTime = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
    }

    const session = new Session({
      patient: userId,
      psychologist: psychiatristId,
      date: sessionDate,
      time: sessionTime,
      type: (sessionType || 'video').toLowerCase(),
      status: 'pending',
      paymentStatus: 'unpaid',
      amount: agreedRate || psychiatrist.session_rate || 50,
      notes: notes || '',
      bookingSource: bookingSource || 'Mobile App',
    });

    await session.save();

    const populatedSession = await Session.findById(session._id)
      .populate('patient', 'name email')
      .populate('psychologist', 'name email specialization');

    res.status(201).json({
      success: true,
      message: 'Session booked successfully',
      session: populatedSession,
    });
  } catch (error) {
    console.error('Book session error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get my sessions
 * GET /api/sessions/my
 */
exports.getMySessions = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    let query = {};
    if (role === 'patient') {
      query.patient = userId;
    } else if (role === 'psychiatrist') {
      query.psychologist = userId;
    }

    const sessions = await Session.find(query)
      .sort({ date: -1, time: -1 })
      .populate('patient', 'name email')
      .populate('psychologist', 'name email specialization')
      .limit(50);

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

/**
 * Get a specific session
 * GET /api/sessions/:id
 */
exports.getSession = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const session = await Session.findById(id)
      .populate('patient', 'name email profileImage')
      .populate('psychologist', 'name email specializations');

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    if (
      session.patient._id.toString() !== userId &&
      session.psychologist._id.toString() !== userId &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to view this session',
      });
    }

    res.json({
      success: true,
      session,
    });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Cancel a session
 * DELETE /api/sessions/cancel/:id
 */
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

    if (session.patient.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to cancel this session',
      });
    }

    if (session.status === 'completed' || session.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Session cannot be cancelled',
      });
    }

    session.status = 'cancelled';
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

/**
 * Rate a session
 * POST /api/sessions/rate/:id
 */
exports.rateSession = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, review, feedback } = req.body;
    const userId = req.user.id;

    const session = await Session.findById(id);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found',
      });
    }

    if (session.patient.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to rate this session',
      });
    }

    if (session.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Session must be completed to rate',
      });
    }

    session.rating = {
      score: rating || 5,
      review: review || feedback || '',
      createdAt: new Date(),
    };
    await session.save();

    res.json({
      success: true,
      message: 'Session rated successfully',
      rating: session.rating,
    });
  } catch (error) {
    console.error('Rate session error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Search therapists
 * GET /api/sessions/search
 */
exports.searchTherapists = async (req, res) => {
  try {
    const { specialization, diagnosis, language, type, available } = req.query;

    console.log('🔍 Searching therapists with query:', req.query);

    let query = { isVerified: true };

    if (specialization) {
      query.specializations = { $in: [specialization] };
    }

    if (diagnosis) {
      query.specializations = { $in: [diagnosis] };
    }

    if (language) {
      query.languages = { $in: [language] };
    }

    if (available === 'true') {
      query.isAvailable = true;
    }

    const therapists = await Psychiatrist.find(query)
      .select('name email specializations experience_years session_rate languages session_types avg_rating total_patients isAvailable contact');

    console.log(`✅ Found ${therapists.length} therapists`);

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

/**
 * Get psychiatrist availability
 * GET /api/sessions/psychiatrist/availability/:id
 */
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
      availability,
    });
  } catch (error) {
    console.error('Get availability error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * Get psychiatrist profile
 * GET /api/sessions/psychiatrist/:id
 */
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
      psychiatrist,
    });
  } catch (error) {
    console.error('Get psychiatrist profile error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};