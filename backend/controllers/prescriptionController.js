const Prescription          = require('../models/Prescription');
const User                  = require('../models/User');
const { userSockets, getIo } = require('../socket');

const getPrescriptions = async (req, res) => {
  try {
    const query = req.userRole === 'patient'
      ? { patientId: req.userId }
      : { doctorId:  req.userId };
    const prescriptions = await Prescription.find(query).sort({ prescribedDate: -1 });
    res.json({ prescriptions });
  } catch {
    res.status(500).json({ error: 'Failed to fetch prescriptions' });
  }
};

const createPrescription = async (req, res) => {
  try {
    if (req.userRole !== 'doctor')
      return res.status(403).json({ error: 'Only doctors can create prescriptions' });

    const doctor = await User.findById(req.userId);
    const { patientId, diagnosis, medicines, advice, validUntil } = req.body;
    if (!patientId || !medicines?.length)
      return res.status(400).json({ error: 'patientId and medicines are required' });

    const prescription = await new Prescription({
      patientId, doctorId: req.userId, doctorName: doctor.name,
      diagnosis, medicines, advice, validUntil
    }).save();

    res.status(201).json(prescription);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create prescription', details: error.message });
  }
};

const requestRefill = async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id);
    if (!prescription) return res.status(404).json({ error: 'Prescription not found' });
    if (prescription.patientId.toString() !== req.userId)
      return res.status(403).json({ error: 'Unauthorized' });

    const doctorSocketId = userSockets.get(prescription.doctorId.toString());
    if (doctorSocketId) {
      const patient = await User.findById(req.userId).select('name');
      getIo().to(doctorSocketId).emit('prescription:refill-request', {
        prescriptionId: prescription._id,
        patientName:    patient?.name,
        diagnosis:      prescription.diagnosis
      });
    }

    res.json({ message: 'Refill request sent to your doctor.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to request refill', details: error.message });
  }
};

module.exports = { getPrescriptions, createPrescription, requestRefill };