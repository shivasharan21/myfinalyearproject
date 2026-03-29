const Appointment                  = require('../models/Appointment');
const User                         = require('../models/User');
const { broadcastAppointmentUpdate } = require('../socket');

const createAppointment = async (req, res) => {
  try {
    const { doctorId, date, time, reason } = req.body;
    if (!doctorId || !date || !time)
      return res.status(400).json({ error: 'Missing required fields' });

    const patient = await User.findById(req.userId);
    const doctor  = await User.findById(doctorId);
    if (!doctor || doctor.role !== 'doctor')
      return res.status(404).json({ error: 'Doctor not found' });

    const appointment = await new Appointment({
      patientId: req.userId, doctorId,
      patientName: patient.name, doctorName: doctor.name,
      date, time, reason: reason || ''
    }).save();

    await broadcastAppointmentUpdate(appointment, 'created');
    res.status(201).json(appointment);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create appointment', details: error.message });
  }
};

const getAppointments = async (req, res) => {
  try {
    const query = req.userRole === 'patient'
      ? { patientId: req.userId }
      : { doctorId:  req.userId };

    const appointments = await Appointment.find(query)
      .populate('patientId', 'name email phone')
      .populate('doctorId',  'name email specialization')
      .sort({ date: -1 });

    res.json(appointments);
  } catch {
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
};

const updateAppointment = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(status))
      return res.status(400).json({ error: 'Invalid status' });

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

    if (req.userRole === 'patient' && appointment.patientId.toString() !== req.userId)
      return res.status(403).json({ error: 'Unauthorized' });
    if (req.userRole === 'doctor' && appointment.doctorId.toString() !== req.userId)
      return res.status(403).json({ error: 'Unauthorized' });

    appointment.status = status;
    await appointment.save();
    await broadcastAppointmentUpdate(appointment, 'updated');
    res.json(appointment);
  } catch {
    res.status(500).json({ error: 'Failed to update appointment' });
  }
};

module.exports = { createAppointment, getAppointments, updateAppointment };