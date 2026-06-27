// server.js - Clean Node.js version
require('dotenv').config();

const app = require('./app');
const connectDB = require('./src/config/db');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, HOST, () => {
      console.log(`🚀 Node.js Backend is live!`);
      console.log(`Listening on: http://${HOST}:${PORT}`);
      console.log(`Health check: http://127.0.0.1:${PORT}/api/health`);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();