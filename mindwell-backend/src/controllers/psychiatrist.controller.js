// src/controllers/psychiatrist.controller.js
const Session = require('../models/Session');
const Patient = require('../models/Patient');
const Payment = require('../models/Payment');
const Chatbot = require('../models/Chatbot');

// ─── GET PSYCHIATRIST DASHBOARD ───────────────────────────────
exports.getPsychiatristDashboard = async (req, res) => {
    try {
        const psychiatristId = req.user._id;

        // Today's date range
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Today's sessions
        const todaysSessions = await Session.find({
            psychiatristId,
            dateTime: { $gte: today, $lt: tomorrow }
        }).populate('patientId', 'name email');

        // Total unique patients
        const allSessions = await Session.find({ psychiatristId });
        const uniquePatientIds = [...new Set(
            allSessions.map(s => s.patientId?.toString()).filter(Boolean)
        )];

        // Total earnings from completed + paid sessions
        const completedSessions = await Session.find({
            psychiatristId,
            status: 'Completed',
            isPaid: true
        });
        const totalEarnings = completedSessions.reduce(
            (sum, s) => sum + (s.agreedRate || 0), 0
        );

        // Average patient rating
        const ratedSessions = await Session.find({
            psychiatristId,
            patientRating: { $ne: null }
        });
        const avgRating = ratedSessions.length > 0
            ? ratedSessions.reduce((sum, s) => sum + s.patientRating, 0) / ratedSessions.length
            : null;

        // Pending appointment requests
        const pendingRequests = await Session.countDocuments({
            psychiatristId,
            status: 'Pending'
        });

        // Get patient risk levels for today's sessions
        const todaysSessionsWithRisk = await Promise.all(
            todaysSessions.map(async (session) => {
                const latestChat = await Chatbot.findOne({
                    patientId: session.patientId?._id
                }).sort({ createdAt: -1 });

                return {
                    sessionId: session._id,
                    patientName: session.patientId?.name || 'Unknown',
                    patientId: session.patientId?._id,
                    dateTime: session.dateTime,
                    sessionType: session.sessionType,
                    status: session.status,
                    agreedRate: session.agreedRate,
                    meetingLink: session.meetingLink,
                    riskLevel: latestChat?.riskLevel || 'Low'
                };
            })
        );

        res.status(200).json({
            success: true,
            data: {
                todaysSessionCount: todaysSessions.length,
                totalPatients: uniquePatientIds.length,
                totalEarnings,
                averageRating: avgRating ? parseFloat(avgRating.toFixed(1)) : null,
                pendingRequests,
                todaysSessions: todaysSessionsWithRisk
            }
        });

    } catch (error) {
        console.error('Psychiatrist dashboard error:', error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── GET MY SESSIONS (PSYCHIATRIST) ──────────────────────────
exports.getPsychiatristSessions = async (req, res) => {
    try {
        const psychiatristId = req.user._id;
        const { status } = req.query;

        let filter = { psychiatristId };
        if (status) filter.status = status;

        const sessions = await Session.find(filter)
            .populate('patientId', 'name email phone_no')
            .sort({ dateTime: -1 });

        // Add risk level to each session
        const sessionsWithRisk = await Promise.all(
            sessions.map(async (session) => {
                const latestChat = await Chatbot.findOne({
                    patientId: session.patientId?._id
                }).sort({ createdAt: -1 });

                return {
                    ...session.toObject(),
                    riskLevel: latestChat?.riskLevel || 'Low',
                    diagnosis: latestChat?.diagnosis || null
                };
            })
        );

        res.status(200).json({
            success: true,
            count: sessionsWithRisk.length,
            data: sessionsWithRisk
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── GET PENDING APPOINTMENT REQUESTS ────────────────────────
exports.getPendingRequests = async (req, res) => {
    try {
        const psychiatristId = req.user._id;

        const requests = await Session.find({
            psychiatristId,
            status: 'Pending'
        }).populate('patientId', 'name email phone_no').sort({ createdAt: -1 });

        const requestsWithRisk = await Promise.all(
            requests.map(async (session) => {
                const latestChat = await Chatbot.findOne({
                    patientId: session.patientId?._id
                }).sort({ createdAt: -1 });

                return {
                    ...session.toObject(),
                    riskLevel: latestChat?.riskLevel || 'Low',
                    diagnosis: latestChat?.diagnosis || null
                };
            })
        );

        res.status(200).json({
            success: true,
            count: requestsWithRisk.length,
            data: requestsWithRisk
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── CONFIRM SESSION ──────────────────────────────────────────
exports.confirmSession = async (req, res) => {
    try {
        const session = await Session.findById(req.params.id);

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found'
            });
        }

        if (session.psychiatristId.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }

        session.status = 'Confirmed';
        session.meetingLink = req.body.meetingLink || '';
        await session.save();

        res.status(200).json({
            success: true,
            message: 'Session confirmed',
            data: session
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── REJECT SESSION ───────────────────────────────────────────
exports.rejectSession = async (req, res) => {
    try {
        const session = await Session.findById(req.params.id);

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found'
            });
        }

        if (session.psychiatristId.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }

        session.status = 'Rejected';
        await session.save();

        res.status(200).json({
            success: true,
            message: 'Session rejected',
            data: session
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── COMPLETE SESSION ─────────────────────────────────────────
exports.completeSession = async (req, res) => {
    try {
        const session = await Session.findById(req.params.id);

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found'
            });
        }

        if (session.psychiatristId.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized'
            });
        }

        session.status = 'Completed';
        await session.save();

        res.status(200).json({
            success: true,
            message: 'Session marked as completed',
            data: session
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── GET MY PATIENTS ──────────────────────────────────────────
exports.getMyPatients = async (req, res) => {
    try {
        const psychiatristId = req.user._id;

        // Get all sessions for this psychiatrist
        const sessions = await Session.find({ psychiatristId })
            .populate('patientId', 'name email phone_no createdAt');

        // Get unique patients only
        const patientMap = new Map();
        sessions.forEach(session => {
            if (session.patientId && !patientMap.has(session.patientId._id.toString())) {
                patientMap.set(session.patientId._id.toString(), session.patientId);
            }
        });

        const uniquePatients = Array.from(patientMap.values());

        // Add risk level for each patient
        const patientsWithRisk = await Promise.all(
            uniquePatients.map(async (patient) => {
                const latestChat = await Chatbot.findOne({
                    patientId: patient._id
                }).sort({ createdAt: -1 });

                const sessionCount = sessions.filter(
                    s => s.patientId._id.toString() === patient._id.toString()
                ).length;

                return {
                    id: patient._id,
                    name: patient.name,
                    email: patient.email,
                    phone_no: patient.phone_no,
                    riskLevel: latestChat?.riskLevel || 'Low',
                    diagnosis: latestChat?.diagnosis || null,
                    totalSessions: sessionCount
                };
            })
        );

        res.status(200).json({
            success: true,
            count: patientsWithRisk.length,
            data: patientsWithRisk
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── GET EARNINGS ─────────────────────────────────────────────
exports.getEarnings = async (req, res) => {
    try {
        const psychiatristId = req.user._id;

        const completedSessions = await Session.find({
            psychiatristId,
            status: 'Completed',
            isPaid: true
        }).populate('patientId', 'name').sort({ createdAt: -1 });

        const totalEarnings = completedSessions.reduce(
            (sum, s) => sum + (s.agreedRate || 0), 0
        );

        // Monthly breakdown
        const monthlyEarnings = {};
        completedSessions.forEach(session => {
            const month = new Date(session.dateTime).toLocaleString('default', {
                month: 'long', year: 'numeric'
            });
            monthlyEarnings[month] = (monthlyEarnings[month] || 0) + session.agreedRate;
        });

        res.status(200).json({
            success: true,
            data: {
                totalEarnings,
                totalPaidSessions: completedSessions.length,
                monthlyBreakdown: monthlyEarnings,
                sessions: completedSessions
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ─── GET PATIENT FEEDBACK ─────────────────────────────────────
exports.getPatientFeedback = async (req, res) => {
    try {
        const psychiatristId = req.user._id;

        const ratedSessions = await Session.find({
            psychiatristId,
            patientRating: { $ne: null }
        }).populate('patientId', 'name').sort({ updatedAt: -1 });

        const avgRating = ratedSessions.length > 0
            ? ratedSessions.reduce((sum, s) => sum + s.patientRating, 0) / ratedSessions.length
            : null;

        res.status(200).json({
            success: true,
            data: {
                averageRating: avgRating ? parseFloat(avgRating.toFixed(1)) : null,
                totalReviews: ratedSessions.length,
                feedback: ratedSessions.map(s => ({
                    patientName: s.patientId?.name || 'Anonymous',
                    rating: s.patientRating,
                    feedback: s.patientFeedback,
                    date: s.updatedAt
                }))
            }
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};