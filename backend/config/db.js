const mongoose = require('mongoose');
const { createDefaultUsers } = require('../utils/seedUsers');

const connectDB = async () => {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/telemedicine';

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✓ Connected to MongoDB');
    await createDefaultUsers();
  } catch (err) {
    console.error('✗ MongoDB connection error:', err);
    process.exit(1);
  }
};

module.exports = connectDB;