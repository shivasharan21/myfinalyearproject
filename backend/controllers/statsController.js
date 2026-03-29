const Appointment            = require('../models/Appointment');
const DiabetesPrediction     = require('../models/DiabetesPrediction');
const HeartDiseasePrediction = require('../models/HeartDiseasePrediction');

const getStats = async (req, res) => {
  try {
    if (req.userRole === 'patient') {
      const [appointmentCount, diabetesCount, heartCount, upcomingCount] = await Promise.all([
        Appointment.countDocuments({ patientId: req.userId }),
        DiabetesPrediction.countDocuments({ userId: req.userId }),
        HeartDiseasePrediction.countDocuments({ userId: req.userId }),
        Appointment.countDocuments({
          patientId: req.userId,
          status: { $in: ['pending', 'confirmed'] },
          date: { $gte: new Date() }
        })
      ]);

      return res.json({
        totalAppointments:       appointmentCount,
        totalPredictions:        diabetesCount + heartCount,
        totalDiabetesPredictions: diabetesCount,
        totalHeartPredictions:   heartCount,
        upcomingAppointments:    upcomingCount
      });
    }

    // Doctor stats
    const today    = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

    const [appointmentCount, todayCount, patientIds] = await Promise.all([
      Appointment.countDocuments({ doctorId: req.userId }),
      Appointment.countDocuments({ doctorId: req.userId, date: { $gte: today, $lt: tomorrow } }),
      Appointment.distinct('patientId', { doctorId: req.userId })
    ]);

    res.json({
      totalAppointments: appointmentCount,
      todayAppointments: todayCount,
      totalPatients:     patientIds.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
};

module.exports = { getStats };