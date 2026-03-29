const bcrypt = require('bcryptjs');
const User   = require('../models/User');

const createDefaultUsers = async () => {
  try {
    if (!await User.findOne({ email: 'doctor@test.com' })) {
      const hashed = await bcrypt.hash('doctor123', 10);
      await new User({
        name: 'Dr. James Wilson', email: 'doctor@test.com',
        password: hashed, role: 'doctor',
        specialization: 'General Practitioner', phone: '+1-555-0100'
      }).save();
      console.log('✓ Default doctor created: doctor@test.com (password: doctor123)');
    }

    if (!await User.findOne({ email: 'patient@test.com' })) {
      const hashed = await bcrypt.hash('patient123', 10);
      await new User({
        name: 'John Smith', email: 'patient@test.com',
        password: hashed, role: 'patient', phone: '+1-555-0101'
      }).save();
      console.log('✓ Default patient created: patient@test.com (password: patient123)');
    }
  } catch (error) {
    console.error('Error creating default users:', error);
  }
};

module.exports = { createDefaultUsers };