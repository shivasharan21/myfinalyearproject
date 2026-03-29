const HealthRecord = require('../models/HealthRecord');
const User        = require('../models/User');
const { userSockets, getIo } = require('../socket');

// ─── Get All Health Records ───────────────────────────────────────────────────

const getHealthRecords = async (req, res) => {
  try {
    let query;
    
    if (req.userRole === 'doctor') {
      // Doctors see records they created for their patients
      query = HealthRecord.find({ doctorId: req.userId });
    } else {
      // Patients see records created for them by doctors
      query = HealthRecord.find({ patientId: req.userId });
    }
    
    const records = await query
      .populate('doctorId', 'name specialization email')
      .populate('patientId', 'name email')
      .sort({ date: -1, createdAt: -1 });

    res.json({ records });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch health records', details: error.message });
  }
};

// ─── Get Single Health Record ─────────────────────────────────────────────────

const getHealthRecordById = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await HealthRecord.findById(id)
      .populate('doctorId', 'name specialization email')
      .populate('patientId', 'name email');

    if (!record) {
      return res.status(404).json({ error: 'Health record not found' });
    }

    // Check authorization
    if (record.patientId._id.toString() !== req.userId && req.userRole === 'patient') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    res.json({ record });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch health record', details: error.message });
  }
};

// ─── Create Health Record ─────────────────────────────────────────────────────
// FIX: Patients can now create health records for themselves (no doctorId).
//      Doctors can still create records and assign them to a patient.

const createHealthRecord = async (req, res) => {
  try {
    const isDoctor  = req.userRole === 'doctor';
    const isPatient = req.userRole === 'patient';

    if (!isDoctor && !isPatient) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const { patientId, title, type, content, severity, notes, date } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }

    if (!content) {
      return res.status(400).json({ error: 'content is required' });
    }

    let resolvedPatientId;
    let resolvedDoctorId = null;

    if (isDoctor) {
      // Doctor must specify which patient this record belongs to
      if (!patientId) {
        return res.status(400).json({ error: 'patientId is required for doctors' });
      }
      const patient = await User.findById(patientId);
      if (!patient || patient.role !== 'patient') {
        return res.status(404).json({ error: 'Patient not found' });
      }
      resolvedPatientId = patientId;
      resolvedDoctorId  = req.userId;
    } else {
      // Patient creates a record for themselves — no doctorId
      resolvedPatientId = req.userId;
    }

    const record = await new HealthRecord({
      patientId:  resolvedPatientId,
      doctorId:   resolvedDoctorId,
      title,
      type:       type || 'diagnosis',
      content,
      severity:   severity || 'normal',
      notes,
      date:       date ? new Date(date) : new Date(),
    }).save();

    const populated = await HealthRecord.findById(record._id)
      .populate('doctorId', 'name specialization email')
      .populate('patientId', 'name email');

    // If a doctor created this, notify the patient via WebSocket
    if (isDoctor) {
      const patientSocketId = userSockets.get(resolvedPatientId.toString());
      if (patientSocketId) {
        getIo().to(patientSocketId).emit('health-record:created', {
          type:   'created',
          record: populated,
        });
      }
    }

    res.status(201).json({ record: populated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create health record', details: error.message });
  }
};

// ─── Update Health Record ─────────────────────────────────────────────────────
// FIX: Doctors can update their own records; patients can update self-created
//      records (those with no doctorId).

const updateHealthRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, type, content, severity, notes, date } = req.body;

    const record = await HealthRecord.findById(id);
    if (!record) {
      return res.status(404).json({ error: 'Health record not found' });
    }

    if (req.userRole === 'doctor') {
      // Doctor can only update records they created
      if (!record.doctorId || record.doctorId.toString() !== req.userId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
    } else if (req.userRole === 'patient') {
      // Patient can only update their own self-created records (no doctorId)
      if (record.patientId.toString() !== req.userId || record.doctorId) {
        return res.status(403).json({ error: 'Patients can only edit their own self-created records' });
      }
    } else {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (title    !== undefined) record.title    = title;
    if (type     !== undefined) record.type     = type;
    if (content  !== undefined) record.content  = content;
    if (severity !== undefined) record.severity = severity;
    if (notes    !== undefined) record.notes    = notes;
    if (date     !== undefined) record.date     = new Date(date);

    record.updatedAt = new Date();
    await record.save();

    const populated = await HealthRecord.findById(id)
      .populate('doctorId', 'name specialization email')
      .populate('patientId', 'name email');

    // Notify patient when a doctor updates their record
    if (req.userRole === 'doctor') {
      const patientSocketId = userSockets.get(record.patientId.toString());
      if (patientSocketId) {
        getIo().to(patientSocketId).emit('health-record:updated', {
          type:   'updated',
          record: populated,
        });
      }
    }

    res.json({ record: populated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update health record', details: error.message });
  }
};

// ─── Delete Health Record ─────────────────────────────────────────────────────
// FIX: Patients can delete their own self-created records; doctors delete theirs.

const deleteHealthRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const record = await HealthRecord.findById(id);

    if (!record) {
      return res.status(404).json({ error: 'Health record not found' });
    }

    if (req.userRole === 'doctor') {
      if (!record.doctorId || record.doctorId.toString() !== req.userId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
    } else if (req.userRole === 'patient') {
      if (record.patientId.toString() !== req.userId || record.doctorId) {
        return res.status(403).json({ error: 'Patients can only delete their own self-created records' });
      }
    } else {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const patientId = record.patientId.toString();
    const wasCreatedByDoctor = !!record.doctorId;

    await HealthRecord.findByIdAndDelete(id);

    // Notify patient when a doctor deletes their record
    if (wasCreatedByDoctor) {
      const patientSocketId = userSockets.get(patientId);
      if (patientSocketId) {
        getIo().to(patientSocketId).emit('health-record:deleted', {
          type:     'deleted',
          recordId: id,
        });
      }
    }

    res.json({ message: 'Health record deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete health record', details: error.message });
  }
};

// ─── Get Records by Type (filter) ─────────────────────────────────────────────

const getRecordsByType = async (req, res) => {
  try {
    const { type } = req.params;
    let query;
    
    if (req.userRole === 'doctor') {
      query = HealthRecord.find({
        doctorId: req.userId,
        type: type,
      });
    } else {
      query = HealthRecord.find({
        patientId: req.userId,
        type: type,
      });
    }
    
    const records = await query
      .populate('doctorId', 'name specialization email')
      .populate('patientId', 'name email')
      .sort({ date: -1, createdAt: -1 });

    res.json({ records });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch records', details: error.message });
  }
};

// ─── Get Patient Records (Doctor view) ────────────────────────────────────────

const getPatientRecords = async (req, res) => {
  try {
    if (req.userRole !== 'doctor') {
      return res.status(403).json({ error: 'Only doctors can access this' });
    }

    const { patientId } = req.params;
    const records = await HealthRecord.find({ patientId, doctorId: req.userId })
      .populate('doctorId', 'name specialization email')
      .populate('patientId', 'name email')
      .sort({ date: -1, createdAt: -1 });

    res.json({ records });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch patient records', details: error.message });
  }
};

// ─── Add Vital Sign ───────────────────────────────────────────────────────────

const addVitalSign = async (req, res) => {
  try {
    if (req.userRole !== 'doctor') {
      return res.status(403).json({ error: 'Only doctors can add vital signs' });
    }

    const { id } = req.params;
    const { name, value, unit } = req.body;

    if (!name || !value || !unit) {
      return res.status(400).json({ error: 'name, value, and unit are required' });
    }

    const record = await HealthRecord.findById(id);
    if (!record) {
      return res.status(404).json({ error: 'Health record not found' });
    }

    if (!record.doctorId || record.doctorId.toString() !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    record.vitals.push({ name, value, unit });
    await record.save();

    const populated = await HealthRecord.findById(id)
      .populate('doctorId', 'name specialization email');

    res.json(populated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add vital sign', details: error.message });
  }
};

module.exports = {
  getHealthRecords,
  getHealthRecordById,
  createHealthRecord,
  updateHealthRecord,
  deleteHealthRecord,
  getRecordsByType,
  getPatientRecords,
  addVitalSign,
};