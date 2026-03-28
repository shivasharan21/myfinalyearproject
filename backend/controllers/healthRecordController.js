// backend/controllers/healthRecordController.js
const HealthRecord = require('../models/HealthRecord');

// @desc    Get health records for current patient
// @route   GET /api/health-records
const getHealthRecords = async (req, res, next) => {
  try {
    const { recordType, limit = 20, page = 1 } = req.query;
    const patientId = req.user.role === 'doctor' ? req.query.patientId : req.user._id;

    if (!patientId) {
      return res.status(400).json({ error: 'Patient ID is required' });
    }

    const query = { patientId };
    if (recordType) query.recordType = recordType;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [records, total] = await Promise.all([
      HealthRecord.find(query)
        .populate('doctorId', 'name specialization')
        .populate('appointmentId', 'date time reason')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      HealthRecord.countDocuments(query),
    ]);

    res.json({
      records,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        limit: parseInt(limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get a single health record
// @route   GET /api/health-records/:id
const getHealthRecord = async (req, res, next) => {
  try {
    const record = await HealthRecord.findById(req.params.id)
      .populate('doctorId', 'name specialization email')
      .populate('appointmentId', 'date time reason');

    if (!record) return res.status(404).json({ error: 'Record not found' });

    const isOwner = record.patientId.toString() === req.user._id.toString();
    const isDoctor = req.user.role === 'doctor';
    if (!isOwner && !isDoctor) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    res.json(record);
  } catch (error) {
    next(error);
  }
};

// @desc    Create health record (doctor adds for patient, or patient self-logs)
// @route   POST /api/health-records
const createHealthRecord = async (req, res, next) => {
  try {
    const {
      patientId, appointmentId, recordType, title, description,
      diagnosis, symptoms, treatment, notes, vitals, labResults,
      followUpRequired, followUpDate, isPrivate,
    } = req.body;

    const resolvedPatientId = req.user.role === 'doctor' ? patientId : req.user._id;
    if (!resolvedPatientId) {
      return res.status(400).json({ error: 'Patient ID is required' });
    }

    const record = await HealthRecord.create({
      patientId: resolvedPatientId,
      doctorId: req.user.role === 'doctor' ? req.user._id : undefined,
      appointmentId,
      recordType: recordType || 'consultation',
      title,
      description,
      diagnosis,
      symptoms,
      treatment,
      notes,
      vitals,
      labResults,
      followUpRequired,
      followUpDate,
      isPrivate: isPrivate || false,
    });

    const populated = await record.populate('doctorId', 'name specialization');
    res.status(201).json(populated);
  } catch (error) {
    next(error);
  }
};

// @desc    Update a health record
// @route   PUT /api/health-records/:id
const updateHealthRecord = async (req, res, next) => {
  try {
    const record = await HealthRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ error: 'Record not found' });

    const isOwner = record.patientId.toString() === req.user._id.toString();
    const isDoctor = req.user.role === 'doctor' &&
      record.doctorId?.toString() === req.user._id.toString();

    if (!isOwner && !isDoctor) {
      return res.status(403).json({ error: 'Not authorized to update this record' });
    }

    const allowedFields = [
      'title', 'description', 'diagnosis', 'symptoms', 'treatment',
      'notes', 'vitals', 'labResults', 'followUpRequired', 'followUpDate',
      'isPrivate', 'attachments',
    ];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) record[field] = req.body[field];
    });

    await record.save();
    const updated = await record.populate('doctorId', 'name specialization');
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a health record
// @route   DELETE /api/health-records/:id
const deleteHealthRecord = async (req, res, next) => {
  try {
    const record = await HealthRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ error: 'Record not found' });

    const isOwner = record.patientId.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await record.deleteOne();
    res.json({ success: true, message: 'Health record deleted' });
  } catch (error) {
    next(error);
  }
};

// @desc    Get vitals timeline for a patient
// @route   GET /api/health-records/vitals/:patientId
const getVitalsTimeline = async (req, res, next) => {
  try {
    const patientId = req.user.role === 'doctor' ? req.params.patientId : req.user._id;
    const records = await HealthRecord.find(
      { patientId, 'vitals.0': { $exists: true } },
      { vitals: 1, createdAt: 1 }
    ).sort({ createdAt: -1 }).limit(30);

    res.json(records);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getHealthRecords,
  getHealthRecord,
  createHealthRecord,
  updateHealthRecord,
  deleteHealthRecord,
  getVitalsTimeline,
};