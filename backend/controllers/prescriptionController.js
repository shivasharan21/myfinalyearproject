// backend/controllers/prescriptionController.js
const Prescription = require('../models/Prescription');
const User = require('../models/User');

// @desc    Get prescriptions for logged-in user
// @route   GET /api/prescriptions
const getPrescriptions = async (req, res, next) => {
  try {
    const { status, limit = 20, page = 1 } = req.query;
    const query = req.user.role === 'doctor'
      ? { doctorId: req.user._id }
      : { patientId: req.user._id };

    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [prescriptions, total] = await Promise.all([
      Prescription.find(query)
        .populate('patientId', 'name email phone dateOfBirth bloodGroup allergies')
        .populate('doctorId', 'name specialization')
        .populate('appointmentId', 'date time')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Prescription.countDocuments(query),
    ]);

    res.json({
      prescriptions,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single prescription
// @route   GET /api/prescriptions/:id
const getPrescription = async (req, res, next) => {
  try {
    const prescription = await Prescription.findById(req.params.id)
      .populate('patientId', 'name email phone dateOfBirth bloodGroup allergies')
      .populate('doctorId', 'name specialization email phone licenseNumber')
      .populate('appointmentId', 'date time reason');

    if (!prescription) return res.status(404).json({ error: 'Prescription not found' });

    const isPatient = prescription.patientId._id.toString() === req.user._id.toString();
    const isDoctor = prescription.doctorId._id.toString() === req.user._id.toString();
    if (!isPatient && !isDoctor) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    res.json(prescription);
  } catch (error) {
    next(error);
  }
};

// @desc    Create prescription (doctor only)
// @route   POST /api/prescriptions
const createPrescription = async (req, res, next) => {
  try {
    if (req.user.role !== 'doctor') {
      return res.status(403).json({ error: 'Only doctors can create prescriptions' });
    }

    const { patientId, appointmentId, medicines, diagnosis, advice, dietaryInstructions, validUntil, notes } = req.body;

    if (!patientId || !medicines?.length) {
      return res.status(400).json({ error: 'Patient ID and at least one medicine are required' });
    }

    const patient = await User.findOne({ _id: patientId, role: 'patient' });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    const prescription = await Prescription.create({
      patientId,
      doctorId: req.user._id,
      appointmentId,
      patientName: patient.name,
      doctorName: req.user.name,
      doctorSpecialization: req.user.specialization,
      medicines,
      diagnosis,
      advice,
      dietaryInstructions,
      validUntil,
      notes,
      prescribedDate: new Date(),
    });

    const populated = await prescription.populate([
      { path: 'patientId', select: 'name email phone' },
      { path: 'doctorId', select: 'name specialization' },
    ]);

    // Notify patient via socket
    const io = req.app.get('io');
    if (io) {
      io.to(`patient_${patientId}`).emit('prescription:new', {
        type: 'new_prescription',
        prescription: populated,
      });
    }

    res.status(201).json(populated);
  } catch (error) {
    next(error);
  }
};

// @desc    Update prescription (doctor only)
// @route   PUT /api/prescriptions/:id
const updatePrescription = async (req, res, next) => {
  try {
    const prescription = await Prescription.findById(req.params.id);
    if (!prescription) return res.status(404).json({ error: 'Prescription not found' });

    if (prescription.doctorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized to update this prescription' });
    }

    const allowedFields = ['medicines', 'diagnosis', 'advice', 'dietaryInstructions',
      'validUntil', 'notes', 'status'];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) prescription[field] = req.body[field];
    });

    await prescription.save();
    const updated = await prescription.populate([
      { path: 'patientId', select: 'name email phone' },
      { path: 'doctorId', select: 'name specialization' },
    ]);

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// @desc    Mark prescription as dispensed
// @route   PATCH /api/prescriptions/:id/dispense
const dispensePrescription = async (req, res, next) => {
  try {
    const prescription = await Prescription.findById(req.params.id);
    if (!prescription) return res.status(404).json({ error: 'Prescription not found' });

    prescription.dispensed = true;
    prescription.dispensedAt = new Date();
    await prescription.save();

    res.json({ success: true, prescription });
  } catch (error) {
    next(error);
  }
};

// @desc    Request refill
// @route   POST /api/prescriptions/:id/refill
const requestRefill = async (req, res, next) => {
  try {
    const prescription = await Prescription.findById(req.params.id)
      .populate('doctorId', 'name');
    if (!prescription) return res.status(404).json({ error: 'Prescription not found' });

    if (prescription.patientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    prescription.refillCount = (prescription.refillCount || 0) + 1;
    await prescription.save();

    // Notify doctor via socket
    const io = req.app.get('io');
    if (io) {
      io.to(`doctor_${prescription.doctorId._id}`).emit('prescription:refill-request', {
        patientName: req.user.name,
        prescriptionId: prescription._id,
      });
    }

    res.json({ success: true, message: 'Refill request sent to doctor' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPrescriptions,
  getPrescription,
  createPrescription,
  updatePrescription,
  dispensePrescription,
  requestRefill,
};