const HealthRecord = require('../models/HealthRecord');

const getHealthRecords = async (req, res) => {
  try {
    const records = await HealthRecord.find({ patientId: req.userId })
      .populate('doctorId', 'name')
      .sort({ createdAt: -1 });
    res.json({ records });
  } catch {
    res.status(500).json({ error: 'Failed to fetch health records' });
  }
};

const createHealthRecord = async (req, res) => {
  try {
    if (req.userRole !== 'doctor')
      return res.status(403).json({ error: 'Only doctors can create health records' });

    const { patientId, title, recordType, description, diagnosis, vitals } = req.body;
    if (!patientId || !title)
      return res.status(400).json({ error: 'patientId and title are required' });

    const record = await new HealthRecord({
      patientId, doctorId: req.userId, title, recordType, description, diagnosis, vitals
    }).save();

    const populated = await HealthRecord.findById(record._id).populate('doctorId', 'name');
    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create health record', details: error.message });
  }
};

module.exports = { getHealthRecords, createHealthRecord };