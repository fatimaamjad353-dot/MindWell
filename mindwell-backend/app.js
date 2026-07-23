// app.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config();

// Import routes
const authRoutes = require('./src/routes/auth.routes');
const aiRoutes = require('./src/routes/ai.routes');
const moodRoutes = require('./src/routes/mood.routes');
const sessionRoutes = require('./src/routes/session.routes');
const paymentRoutes = require('./src/routes/payment.routes');
const adminRoutes = require('./src/routes/admin.routes');
const recommenderRoutes = require('./src/routes/recommender.routes');
const psychiatristRoutes = require('./src/routes/psychiatrist.routes');
const passwordResetRoutes = require('./src/routes/passwordReset.routes'); // ✅ ADD

const app = express();

// ─── CORS ─────────────────────────────────────────────────────
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ─── Stripe Webhook MUST come BEFORE express.json() ──────────
app.post(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' }),
  (req, res, next) => {
    console.log('🔔 Stripe webhook received');
    next();
  },
  require('./src/controllers/payment.controller').stripeWebhook
);

// ─── Regular JSON Middleware ───────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Database Connection Check ────────────────────────────────
app.use('/api', (req, res, next) => {
  if (req.path === '/health') return next();
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      success: false,
      message: 'Database not connected. Check MONGO_URI in .env'
    });
  }
  next();
});

// ─── Routes ───────────────────────────────────────────────────
// Auth
app.use('/api/auth', authRoutes);

// Password Reset ✅ ADD
app.use('/api/password-reset', passwordResetRoutes);

// AI — recommender BEFORE general ai
app.use('/api/ai/recommender', recommenderRoutes);
app.use('/api/ai', aiRoutes);

// Mood
app.use('/api/mood', moodRoutes);

// Sessions
app.use('/api/sessions', sessionRoutes);

// Payments
app.use('/api/payments', paymentRoutes);

// Admin
app.use('/api/admin', adminRoutes);

// Psychiatrist
app.use('/api/psychiatrist', psychiatristRoutes);

// ─── Health Check ──────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'MindWell API is running',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    services: {
      ai: process.env.AI_SERVICE_URL || 'http://localhost:5010',
      stripe: process.env.STRIPE_SECRET_KEY ? 'configured' : 'not configured'
    }
  });
});

// ─── 404 Handler ──────────────────────────────────────────────
app.use((req, res) => {
  console.log(`❌ Route not found: ${req.method} ${req.path}`);
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// ─── Error Handler ─────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

module.exports = app;