const Prescription          = require('../models/Prescription');
const User                  = require('../models/User');
const { userSockets, getIo } = require('../socket');

// ─── Get All Prescriptions ────────────────────────────────────────────────────

const getPrescriptions = async (req, res) => {
  try {
    const query = req.userRole === 'patient'
      ? { patientId: req.userId }
      : { doctorId:  req.userId };
    
    const prescriptions = await Prescription.find(query)
      .populate('patientId', 'name email phone')
      .populate('doctorId',  'name specialization email')
      .sort({ prescribedDate: -1 });
    
    res.json({ prescriptions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch prescriptions', details: error.message });
  }
};

// ─── Get Single Prescription ──────────────────────────────────────────────────

const getPrescriptionById = async (req, res) => {
  try {
    const { id } = req.params;
    const prescription = await Prescription.findById(id)
      .populate('patientId', 'name email phone')
      .populate('doctorId',  'name specialization email');

    if (!prescription) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    // Check authorization
    if (req.userRole === 'patient' && prescription.patientId._id.toString() !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    if (req.userRole === 'doctor' && prescription.doctorId._id.toString() !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json(prescription);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch prescription', details: error.message });
  }
};

// ─── Create Prescription ──────────────────────────────────────────────────────

const createPrescription = async (req, res) => {
  try {
    if (req.userRole !== 'doctor') {
      return res.status(403).json({ error: 'Only doctors can create prescriptions' });
    }

    const doctor = await User.findById(req.userId);
    const { patientId, diagnosis, medicines, advice, validUntil } = req.body;

    // Validation
    if (!patientId || !medicines?.length) {
      return res.status(400).json({ error: 'patientId and medicines are required' });
    }

    // Verify patient exists
    const patient = await User.findById(patientId);
    if (!patient || patient.role !== 'patient') {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const prescription = await new Prescription({
      patientId,
      doctorId: req.userId,
      doctorName: doctor.name,
      diagnosis,
      medicines,
      advice,
      validUntil: validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days default
      status: 'active',
    }).save();

    const populated = await Prescription.findById(prescription._id)
      .populate('patientId', 'name email phone')
      .populate('doctorId', 'name specialization email');

    // Notify patient via WebSocket
    const patientSocketId = userSockets.get(patientId.toString());
    if (patientSocketId) {
      getIo().to(patientSocketId).emit('prescription:created', {
        type: 'created',
        prescription: populated
      });
    }

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create prescription', details: error.message });
  }
};

// ─── Update Prescription ──────────────────────────────────────────────────────

const updatePrescription = async (req, res) => {
  try {
    if (req.userRole !== 'doctor') {
      return res.status(403).json({ error: 'Only doctors can update prescriptions' });
    }

    const { id } = req.params;
    const { diagnosis, medicines, advice, validUntil, status } = req.body;

    const prescription = await Prescription.findById(id);
    if (!prescription) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    // Check authorization
    if (prescription.doctorId.toString() !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Update fields
    if (diagnosis) prescription.diagnosis = diagnosis;
    if (medicines) prescription.medicines = medicines;
    if (advice) prescription.advice = advice;
    if (validUntil) prescription.validUntil = validUntil;
    if (status && ['active', 'expired', 'cancelled'].includes(status)) {
      prescription.status = status;
    }

    await prescription.save();

    const populated = await Prescription.findById(id)
      .populate('patientId', 'name email phone')
      .populate('doctorId', 'name specialization email');

    // Notify patient
    const patientSocketId = userSockets.get(prescription.patientId.toString());
    if (patientSocketId) {
      getIo().to(patientSocketId).emit('prescription:updated', {
        type: 'updated',
        prescription: populated
      });
    }

    res.json(populated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update prescription', details: error.message });
  }
};

// ─── Delete Prescription ──────────────────────────────────────────────────────

const deletePrescription = async (req, res) => {
  try {
    if (req.userRole !== 'doctor') {
      return res.status(403).json({ error: 'Only doctors can delete prescriptions' });
    }

    const { id } = req.params;
    const prescription = await Prescription.findById(id);

    if (!prescription) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    if (prescription.doctorId.toString() !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const patientId = prescription.patientId.toString();
    await Prescription.findByIdAndDelete(id);

    // Notify patient
    const patientSocketId = userSockets.get(patientId);
    if (patientSocketId) {
      getIo().to(patientSocketId).emit('prescription:deleted', {
        type: 'deleted',
        prescriptionId: id
      });
    }

    res.json({ message: 'Prescription deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete prescription', details: error.message });
  }
};

// ─── Request Refill ──────────────────────────────────────────────────────────

const requestRefill = async (req, res) => {
  try {
    const { id } = req.params;
    const prescription = await Prescription.findById(id);

    if (!prescription) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    if (prescription.patientId.toString() !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const doctorSocketId = userSockets.get(prescription.doctorId.toString());
    if (doctorSocketId) {
      const patient = await User.findById(req.userId).select('name');
      getIo().to(doctorSocketId).emit('prescription:refill-request', {
        prescriptionId: prescription._id,
        patientName:    patient?.name,
        diagnosis:      prescription.diagnosis,
        medicines:      prescription.medicines,
        timestamp:      new Date()
      });
    }

    res.json({ message: 'Refill request sent to your doctor.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to request refill', details: error.message });
  }
};

// ─── Get Patient Prescriptions (Doctor view) ──────────────────────────────────

const getPatientPrescriptions = async (req, res) => {
  try {
    if (req.userRole !== 'doctor') {
      return res.status(403).json({ error: 'Only doctors can access this' });
    }

    const { patientId } = req.params;
    const prescriptions = await Prescription.find({
      patientId,
      doctorId: req.userId
    })
      .populate('patientId', 'name email phone')
      .populate('doctorId', 'name specialization email')
      .sort({ prescribedDate: -1 });

    res.json({ prescriptions });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch prescriptions', details: error.message });
  }
};

module.exports = {
  getPrescriptions,
  getPrescriptionById,
  createPrescription,
  updatePrescription,
  deletePrescription,
  requestRefill,
  getPatientPrescriptions,
};