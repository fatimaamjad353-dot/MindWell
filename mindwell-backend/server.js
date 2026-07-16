// server.js
require('dotenv').config();

const app = require('./app');
const connectDB = require('./src/config/db');

const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        await connectDB();

        // ✅ IMPORTANT: '0.0.0.0' allows connections from other devices
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Node.js Backend is live!`);
            console.log(`📡 Listening on: http://localhost:${PORT}`);
            console.log(`📱 Mobile access: http://192.168.10.7:${PORT}`);
            console.log(`✅ Health check: http://localhost:${PORT}/api/health`);
        });

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();