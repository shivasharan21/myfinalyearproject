// backend/controllers/appointmentController.js
const Appointment = require('../models/Appointment');
const User = require('../models/User');

// @desc    Get appointments for logged-in user
// @route   GET /api/appointments
const getAppointments = async (req, res, next) => {
  try {
    const query = req.user.role === 'doctor'
      ? { doctorId: req.user._id }
      : { patientId: req.user._id };

    const { status, from, to } = req.query;
    if (status) query.status = status;
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from);
      if (to) query.date.$lte = new Date(to);
    }

    const appointments = await Appointment.find(query)
      .populate('patientId', 'name email phone')
      .populate('doctorId', 'name email specialization phone')
      .sort({ date: -1, time: -1 });

    res.json(appointments);
  } catch (error) {
    next(error);
  }
};

// @desc    Create appointment
// @route   POST /api/appointments
const createAppointment = async (req, res, next) => {
  try {
    const { doctorId, date, time, reason, type } = req.body;

    const doctor = await User.findOne({ _id: doctorId, role: 'doctor' });
    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }

    // Check slot availability
    const conflict = await Appointment.findOne({
      doctorId,
      date: new Date(date),
      time,
      status: { $in: ['pending', 'confirmed'] },
    });
    if (conflict) {
      return res.status(409).json({ error: 'This time slot is already booked' });
    }

    const appointment = await Appointment.create({
      patientId: req.user._id,
      doctorId,
      patientName: req.user.name,
      doctorName: doctor.name,
      date: new Date(date),
      time,
      reason,
      type: type || 'video',
    });

    const populated = await appointment.populate([
      { path: 'patientId', select: 'name email phone' },
      { path: 'doctorId', select: 'name email specialization phone' },
    ]);

    // Emit socket event (accessed via req.app)
    const io = req.app.get('io');
    if (io) {
      io.to(`doctor_${doctorId}`).emit('appointment:created', {
        type: 'created',
        appointment: populated,
      });
    }

    res.status(201).json(populated);
  } catch (error) {
    next(error);
  }
};

// @desc    Update appointment status / details
// @route   PATCH /api/appointments/:id
const updateAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // Only the doctor or the patient involved can update
    const isDoctor = req.user.role === 'doctor' &&
      appointment.doctorId.toString() === req.user._id.toString();
    const isPatient = req.user.role === 'patient' &&
      appointment.patientId.toString() === req.user._id.toString();

    if (!isDoctor && !isPatient) {
      return res.status(403).json({ error: 'Not authorized to update this appointment' });
    }

    const allowedFields = isDoctor
      ? ['status', 'notes', 'doctorNotes', 'diagnosis', 'followUpDate', 'callDuration', 'cancellationReason']
      : ['status', 'reason', 'cancellationReason'];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) appointment[field] = req.body[field];
    });

    if (req.body.status === 'cancelled') {
      appointment.cancelledBy = isDoctor ? 'doctor' : 'patient';
    }

    await appointment.save();
    const updated = await appointment.populate([
      { path: 'patientId', select: 'name email phone' },
      { path: 'doctorId', select: 'name email specialization phone' },
    ]);

    const io = req.app.get('io');
    if (io) {
      io.to(`patient_${appointment.patientId}`).emit('appointment:updated', {
        type: 'updated',
        appointment: updated,
      });
      io.to(`doctor_${appointment.doctorId}`).emit('appointment:updated', {
        type: 'updated',
        appointment: updated,
      });
    }

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// @desc    Get single appointment
// @route   GET /api/appointments/:id
const getAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('patientId', 'name email phone dateOfBirth bloodGroup')
      .populate('doctorId', 'name email specialization phone');

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const isAllowed =
      appointment.patientId._id.toString() === req.user._id.toString() ||
      appointment.doctorId._id.toString() === req.user._id.toString();

    if (!isAllowed) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    res.json(appointment);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete appointment (admin only)
// @route   DELETE /api/appointments/:id
const deleteAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    await appointment.deleteOne();
    res.json({ success: true, message: 'Appointment removed' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAppointments,
  createAppointment,
  updateAppointment,
  getAppointment,
  deleteAppointment,
};