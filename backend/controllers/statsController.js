// backend/controllers/statsController.js
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const DiabetesPrediction = require('../models/DiabetesPrediction');
const HeartPrediction = require('../models/HeartPrediction');
const Prescription = require('../models/Prescription');
const HealthRecord = require('../models/HealthRecord');

// @desc    Get dashboard stats for current user
// @route   GET /api/stats
const getStats = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (req.user.role === 'doctor') {
      const [
        totalAppointments,
        todayAppointments,
        pendingAppointments,
        completedAppointments,
        totalPatients,
        activePrescriptions,
      ] = await Promise.all([
        Appointment.countDocuments({ doctorId: userId }),
        Appointment.countDocuments({
          doctorId: userId,
          date: { $gte: today, $lt: tomorrow },
        }),
        Appointment.countDocuments({ doctorId: userId, status: 'pending' }),
        Appointment.countDocuments({ doctorId: userId, status: 'completed' }),
        Appointment.distinct('patientId', { doctorId: userId }).then(ids => ids.length),
        Prescription.countDocuments({ doctorId: userId, status: 'active' }),
      ]);

      return res.json({
        totalAppointments,
        todayAppointments,
        pendingAppointments,
        completedAppointments,
        totalPatients,
        activePrescriptions,
      });
    }

    // Patient stats
    const [
      totalAppointments,
      upcomingAppointments,
      completedAppointments,
      totalPredictions,
      activePrescriptions,
      healthRecords,
    ] = await Promise.all([
      Appointment.countDocuments({ patientId: userId }),
      Appointment.countDocuments({
        patientId: userId,
        date: { $gte: new Date() },
        status: { $in: ['pending', 'confirmed'] },
      }),
      Appointment.countDocuments({ patientId: userId, status: 'completed' }),
      Promise.all([
        DiabetesPrediction.countDocuments({ userId }),
        HeartPrediction.countDocuments({ userId }),
      ]).then(([d, h]) => d + h),
      Prescription.countDocuments({ patientId: userId, status: 'active' }),
      HealthRecord.countDocuments({ patientId: userId }),
    ]);

    res.json({
      totalAppointments,
      upcomingAppointments,
      completedAppointments,
      totalPredictions,
      activePrescriptions,
      healthRecords,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin: platform-wide stats
// @route   GET /api/stats/admin
const getAdminStats = async (req, res, next) => {
  try {
    const [totalUsers, totalDoctors, totalPatients, totalAppointments, recentAppointments] = await Promise.all([
      User.countDocuments({ isActive: true }),
      User.countDocuments({ role: 'doctor', isActive: true }),
      User.countDocuments({ role: 'patient', isActive: true }),
      Appointment.countDocuments(),
      Appointment.find().sort({ createdAt: -1 }).limit(5)
        .populate('patientId', 'name')
        .populate('doctorId', 'name specialization'),
    ]);

    res.json({
      totalUsers, totalDoctors, totalPatients, totalAppointments, recentAppointments,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getStats, getAdminStats };