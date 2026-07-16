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

const app = express();

// ─── CORS Middleware ──────────────────────────────────────
app.use(cors());

// ─── IMPORTANT: Stripe Webhook MUST come BEFORE express.json() ───
app.use(
    '/api/payments/webhook',
    express.raw({ type: 'application/json' })
);

// ─── Regular JSON Middleware ──────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Database Connection Check Middleware ──────────────────
app.use('/api', (req, res, next) => {
    if (req.path === '/health') return next();
    if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({
            success: false,
            message: 'Database not connected. Check MONGO_URI in .env and restart the backend.'
        });
    }
    next();
});

// ─── Routes ────────────────────────────────────────────────
// ✅ IMPORTANT: Specific routes BEFORE general routes

// Auth routes
app.use('/api/auth', authRoutes);

// AI routes (recommender before general AI)
app.use('/api/ai/recommender', recommenderRoutes);
app.use('/api/ai', aiRoutes);

// Mood routes
app.use('/api/mood', moodRoutes);

// Session routes
app.use('/api/sessions', sessionRoutes);

// Payment routes
app.use('/api/payments', paymentRoutes);

// Admin routes
app.use('/api/admin', adminRoutes);

// ─── Health Check ──────────────────────────────────────────
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'MindWell API is running',
        timestamp: new Date().toISOString(),
        services: {
            ai: process.env.AI_SERVICE_URL || 'http://localhost:5010',
            stripe: process.env.STRIPE_SECRET_KEY ? 'configured' : 'not configured'
        }
    });
});

// ─── 404 Handler ────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// ─── Error Handler ──────────────────────────────────────────
app.use((err, req, res, next) => {
    console.error('❌ Error:', err.message);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error'
    });
});

module.exports = app;