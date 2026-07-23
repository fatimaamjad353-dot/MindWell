// src/controllers/payment.controller.js
let stripe = null;

if (process.env.STRIPE_SECRET_KEY) {
  stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  console.log('✅ Stripe initialized');
} else {
  console.log('⚠️ Stripe not configured — STRIPE_SECRET_KEY missing');
}

const Payment = require('../models/Payment');
const Session = require('../models/Session');

// ─── CREATE PAYMENT INTENT ────────────────────────────────────
const createPaymentIntent = async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide session ID'
      });
    }

    if (!stripe) {
      return res.status(503).json({
        success: false,
        message: 'Payment service not configured. Add STRIPE_SECRET_KEY to .env'
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

    // Check session belongs to this patient
    if (session.patientId.toString() !== req.user._id.toString()) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to pay for this session'
      });
    }

    // Check not already paid
    if (session.isPaid) {
      return res.status(400).json({
        success: false,
        message: 'This session has already been paid'
      });
    }

    // ✅ Amount in smallest currency unit
    // For USD: cents (2500 PKR → use as $25.00 = 2500 cents)
    // Stripe doesn't support PKR so we use USD
    const amount = Math.round(session.agreedRate * 100);

    // Create Stripe Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        sessionId: sessionId.toString(),
        patientId: req.user._id.toString(),
        psychiatristId: session.psychiatristId._id.toString(),
        psychiatristName: session.psychiatristId.name
      },
      description: `MindWell Session with ${session.psychiatristId.name}`
    });

    // Save payment record to database
    const payment = await Payment.create({
      patientId: req.user._id,
      psychiatristId: session.psychiatristId._id,
      sessionId,
      amount: session.agreedRate,
      currency: 'usd',
      stripePaymentIntentId: paymentIntent.id,
      stripeClientSecret: paymentIntent.client_secret,
      status: 'Pending'
    });

    console.log(`✅ Payment intent created: ${paymentIntent.id}`);

    res.status(201).json({
      success: true,
      message: 'Payment intent created',
      data: {
        paymentId: payment._id,
        clientSecret: paymentIntent.client_secret,
        amount: session.agreedRate,
        currency: 'usd',
        psychiatristName: session.psychiatristId.name,
        sessionType: session.sessionType,
        dateTime: session.dateTime
      }
    });

  } catch (error) {
    console.error('❌ Payment Intent Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ─── CONFIRM PAYMENT ──────────────────────────────────────────
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
        message: 'Payment service not configured'
      });
    }

    // Verify payment status with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Find payment record in our database
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
      // ✅ Mark payment as completed
      payment.status = 'Completed';
      payment.transactionId = paymentIntentId;
      payment.paidAt = new Date();
      await payment.save();

      // ✅ Mark session as paid and confirmed
      await Session.findByIdAndUpdate(
        payment.sessionId,
        {
          isPaid: true,
          status: 'Confirmed'
        }
      );

      console.log(`✅ Payment confirmed: ${paymentIntentId}`);

      res.status(200).json({
        success: true,
        message: 'Payment confirmed successfully',
        data: {
          paymentId: payment._id,
          amount: payment.amount,
          status: payment.status,
          sessionId: payment.sessionId,
          paidAt: payment.paidAt
        }
      });

    } else if (paymentIntent.status === 'canceled') {
      payment.status = 'Cancelled';
      await payment.save();

      res.status(400).json({
        success: false,
        message: 'Payment was cancelled',
        stripeStatus: paymentIntent.status
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
    console.error('❌ Confirm Payment Error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ─── GET MY PAYMENTS (PATIENT) ────────────────────────────────
const getMyPayments = async (req, res) => {
  try {
    const payments = await Payment.find({
      patientId: req.user._id
    })
      .populate('psychiatristId', 'name specialization')
      .populate('sessionId', 'dateTime sessionType status agreedRate')
      .sort({ createdAt: -1 });

    const totalSpent = payments
      .filter(p => p.status === 'Completed')
      .reduce((sum, p) => sum + p.amount, 0);

    res.status(200).json({
      success: true,
      count: payments.length,
      totalSpent,
      data: payments
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET PAYMENT DETAILS ──────────────────────────────────────
const getPaymentDetails = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('patientId', 'name email')
      .populate('psychiatristId', 'name specialization')
      .populate('sessionId', 'dateTime sessionType status agreedRate');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Make sure the requesting user owns this payment
    if (payment.patientId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this payment'
      });
    }

    res.status(200).json({ success: true, data: payment });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── GET PSYCHIATRIST EARNINGS ────────────────────────────────
const getPsychiatristEarnings = async (req, res) => {
  try {
    const payments = await Payment.find({
      psychiatristId: req.user._id,
      status: 'Completed'
    })
      .populate('patientId', 'name email')
      .populate('sessionId', 'dateTime sessionType agreedRate')
      .sort({ createdAt: -1 });

    const totalEarnings = payments.reduce((sum, p) => sum + p.amount, 0);

    // Monthly breakdown
    const monthlyBreakdown = {};
    payments.forEach(payment => {
      const month = new Date(payment.createdAt).toLocaleString('default', {
        month: 'long', year: 'numeric'
      });
      monthlyBreakdown[month] = (monthlyBreakdown[month] || 0) + payment.amount;
    });

    res.status(200).json({
      success: true,
      data: {
        totalEarnings,
        totalSessions: payments.length,
        monthlyBreakdown,
        payments
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── REFUND PAYMENT ───────────────────────────────────────────
const refundPayment = async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({
        success: false,
        message: 'Payment service not configured'
      });
    }

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
      payment.refundedAt = new Date();
      await payment.save();

      // Update session status
      await Session.findByIdAndUpdate(
        payment.sessionId,
        { status: 'Cancelled', isPaid: false }
      );

      console.log(`✅ Refund processed: ${refund.id}`);

      res.status(200).json({
        success: true,
        message: 'Payment refunded successfully',
        data: payment
      });

    } else {
      res.status(400).json({
        success: false,
        message: 'Refund could not be processed',
        refundStatus: refund.status
      });
    }

  } catch (error) {
    console.error('❌ Refund Error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── STRIPE WEBHOOK ───────────────────────────────────────────
const stripeWebhook = async (req, res) => {
  if (!stripe) {
    return res.status(503).json({ success: false, message: 'Stripe not configured' });
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('❌ Webhook signature error:', err.message);
    return res.status(400).json({ success: false, message: err.message });
  }

  // Handle payment events
  switch (event.type) {
    case 'payment_intent.succeeded':
      const intent = event.data.object;
      await Payment.findOneAndUpdate(
        { stripePaymentIntentId: intent.id },
        { status: 'Completed', paidAt: new Date() }
      );
      await Session.findOneAndUpdate(
        { _id: intent.metadata.sessionId },
        { isPaid: true, status: 'Confirmed' }
      );
      console.log(`✅ Webhook: Payment succeeded ${intent.id}`);
      break;

    case 'payment_intent.payment_failed':
      const failedIntent = event.data.object;
      await Payment.findOneAndUpdate(
        { stripePaymentIntentId: failedIntent.id },
        { status: 'Failed' }
      );
      console.log(`❌ Webhook: Payment failed ${failedIntent.id}`);
      break;

    default:
      console.log(`Unhandled webhook event: ${event.type}`);
  }

  res.json({ received: true });
};

module.exports = {
  createPaymentIntent,
  confirmPayment,
  getMyPayments,
  getPaymentDetails,
  getPsychiatristEarnings,
  refundPayment,
  stripeWebhook
};