// backend/controllers/doctorController.js
const User = require('../models/User');
const Appointment = require('../models/Appointment');

// @desc    Get all doctors
// @route   GET /api/doctors
const getDoctors = async (req, res, next) => {
  try {
    const { specialization, search } = req.query;
    const query = { role: 'doctor', isActive: true };

    if (specialization) query.specialization = { $regex: specialization, $options: 'i' };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { specialization: { $regex: search, $options: 'i' } },
      ];
    }

    const doctors = await User.find(query)
      .select('name email specialization phone experience licenseNumber profilePhoto')
      .sort({ name: 1 });

    res.json(doctors);
  } catch (error) {
    next(error);
  }
};

// @desc    Get single doctor with availability
// @route   GET /api/doctors/:id
const getDoctor = async (req, res, next) => {
  try {
    const doctor = await User.findOne({ _id: req.params.id, role: 'doctor' })
      .select('-password');
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });

    // Get upcoming confirmed/pending appointments to show busy slots
    const upcomingAppointments = await Appointment.find({
      doctorId: doctor._id,
      date: { $gte: new Date() },
      status: { $in: ['pending', 'confirmed'] },
    }).select('date time status');

    res.json({ doctor: doctor.toSafeObject(), upcomingAppointments });
  } catch (error) {
    next(error);
  }
};

// @desc    Get available time slots for a doctor on a date
// @route   GET /api/doctors/:id/slots?date=YYYY-MM-DD
const getAvailableSlots = async (req, res, next) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'Date is required' });

    const allSlots = [
      '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
      '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
    ];

    const bookedSlots = await Appointment.find({
      doctorId: req.params.id,
      date: new Date(date),
      status: { $in: ['pending', 'confirmed'] },
    }).select('time');

    const bookedTimes = bookedSlots.map(a => a.time);
    const availableSlots = allSlots.filter(slot => !bookedTimes.includes(slot));

    res.json({ date, available: availableSlots, booked: bookedTimes });
  } catch (error) {
    next(error);
  }
};

// @desc    Get doctor's patients list
// @route   GET /api/doctors/patients
const getDoctorPatients = async (req, res, next) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ error: 'Access restricted to doctors' });
    }

    const appointments = await Appointment.find({ doctorId: req.user._id })
      .populate('patientId', 'name email phone dateOfBirth bloodGroup gender')
      .select('patientId status date');

    // Deduplicate patients
    const patientsMap = {};
    appointments.forEach(apt => {
      if (apt.patientId) {
        const id = apt.patientId._id.toString();
        if (!patientsMap[id]) {
          patientsMap[id] = {
            ...apt.patientId.toObject(),
            appointmentCount: 1,
            lastVisit: apt.date,
          };
        } else {
          patientsMap[id].appointmentCount++;
          if (new Date(apt.date) > new Date(patientsMap[id].lastVisit)) {
            patientsMap[id].lastVisit = apt.date;
          }
        }
      }
    });

    res.json(Object.values(patientsMap));
  } catch (error) {
    next(error);
  }
};

module.exports = { getDoctors, getDoctor, getAvailableSlots, getDoctorPatients };