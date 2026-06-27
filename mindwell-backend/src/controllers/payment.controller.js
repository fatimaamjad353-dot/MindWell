let stripe = null;

if (process.env.STRIPE_SECRET_KEY) {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
}

const Payment = require('../models/Payment');
const Session = require('../models/Session');
const Psychiatrist = require('../models/Psychiatrist');

// ─── CREATE PAYMENT INTENT ────────────────────────
const createPaymentIntent = async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide session ID'
      });
    }

    // Get session details
    const session = await Session.findById(sessionId)
      .populate('psychiatristId', 'name sessionRate');

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Check session belongs to patient
    if (session.patientId.toString() !==
        req.user._id.toString()) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // Check already paid
    if (session.isPaid) {
      return res.status(400).json({
        success: false,
        message: 'Session already paid'
      });
    }

    if (!stripe) {
      return res.status(503).json({
        success: false,
        message: 'Stripe is not configured on the backend'
      });
    }

    // Amount in cents for Stripe
    const amount = Math.round(session.agreedRate * 100);

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      metadata: {
        sessionId: sessionId,
        patientId: req.user._id.toString(),
        psychiatristId: session.psychiatristId._id.toString()
      }
    });

    // Save payment record
    const payment = await Payment.create({
      patientId: req.user._id,
      psychiatristId: session.psychiatristId._id,
      sessionId,
      amount: session.agreedRate,
      stripePaymentIntentId: paymentIntent.id,
      stripeClientSecret: paymentIntent.client_secret
    });

    res.status(201).json({
      success: true,
      message: 'Payment intent created',
      data: {
        paymentId: payment._id,
        clientSecret: paymentIntent.client_secret,
        amount: session.agreedRate,
        currency: 'usd',
        psychiatristName: session.psychiatristId.name
      }
    });

  } catch (error) {
    console.error('Payment Intent Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ─── CONFIRM PAYMENT ──────────────────────────────
const confirmPayment = async (req, res) => {
  try {
    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide payment intent ID'
      });
    }

    if (!stripe) {
      return res.status(503).json({
        success: false,
        message: 'Stripe is not configured on the backend'
      });
    }

    // Verify with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(
      paymentIntentId
    );

    // Find payment record
    const payment = await Payment.findOne({
      stripePaymentIntentId: paymentIntentId
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment record not found'
      });
    }

    if (paymentIntent.status === 'succeeded') {
      // Update payment status
      payment.status = 'Completed';
      payment.transactionId = paymentIntentId;
      await payment.save();

      // Update session as paid
      await Session.findByIdAndUpdate(
        payment.sessionId,
        {
          isPaid: true,
          status: 'Confirmed'
        }
      );

      res.status(200).json({
        success: true,
        message: 'Payment confirmed successfully',
        data: payment
      });

    } else {
      payment.status = 'Failed';
      await payment.save();

      res.status(400).json({
        success: false,
        message: 'Payment not completed',
        stripeStatus: paymentIntent.status
      });
    }

  } catch (error) {
    console.error('Confirm Payment Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ─── GET MY PAYMENTS (PATIENT) ────────────────────
const getMyPayments = async (req, res) => {
  try {
    const payments = await Payment.find({
      patientId: req.user._id
    })
      .populate('psychiatristId', 'name specialization')
      .populate('sessionId', 'dateTime sessionType status')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: payments.length,
      data: payments
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ─── GET PAYMENT DETAILS ──────────────────────────
const getPaymentDetails = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('patientId', 'name email')
      .populate('psychiatristId', 'name specialization')
      .populate('sessionId', 'dateTime sessionType status');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.status(200).json({
      success: true,
      data: payment
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ─── GET PSYCHIATRIST EARNINGS ────────────────────
const getPsychiatristEarnings = async (req, res) => {
  try {
    const payments = await Payment.find({
      psychiatristId: req.user._id,
      status: 'Completed'
    })
      .populate('patientId', 'name email')
      .populate('sessionId', 'dateTime sessionType')
      .sort({ createdAt: -1 });

    // Calculate total earnings
    const totalEarnings = payments.reduce(
      (sum, payment) => sum + payment.amount, 0
    );

    res.status(200).json({
      success: true,
      data: {
        totalEarnings,
        totalSessions: payments.length,
        payments
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ─── REFUND PAYMENT ───────────────────────────────
const refundPayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    if (payment.status !== 'Completed') {
      return res.status(400).json({
        success: false,
        message: 'Only completed payments can be refunded'
      });
    }

    // Process refund via Stripe
    const refund = await stripe.refunds.create({
      payment_intent: payment.stripePaymentIntentId
    });

    if (refund.status === 'succeeded') {
      payment.status = 'Refunded';
      await payment.save();

      // Update session status
      await Session.findByIdAndUpdate(
        payment.sessionId,
        { status: 'Cancelled', isPaid: false }
      );

      res.status(200).json({
        success: true,
        message: 'Payment refunded successfully',
        data: payment
      });
    }

  } catch (error) {
    console.error('Refund Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  createPaymentIntent,
  confirmPayment,
  getMyPayments,
  getPaymentDetails,
  getPsychiatristEarnings,
  refundPayment
};