const mongoose = require('mongoose');

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    console.log('⚠️ No MONGO_URI configured. Skipping MongoDB connection.');
    return null;
  }

  try {
    console.log('Connecting to MongoDB...');

    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      family: 4  // Force IPv4
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📦 Database Name: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
    return null;
  }
};

module.exports = connectDB;