const User = require('../models/User');

const getDoctors = async (req, res) => {
  try {
    res.json(await User.find({ role: 'doctor' }).select('-password'));
  } catch {
    res.status(500).json({ error: 'Failed to fetch doctors' });
  }
};

module.exports = { getDoctors };