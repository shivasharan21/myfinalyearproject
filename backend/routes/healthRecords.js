const express        = require('express');
const router         = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  getHealthRecords,
  getHealthRecordById,
  createHealthRecord,
  updateHealthRecord,
  deleteHealthRecord,
  getRecordsByType,
  getPatientRecords,
  addVitalSign,
} = require('../controllers/healthRecordController');

// ─── Health Record Routes ─────────────────────────────────────────────────────

// Get all health records for the user
router.get('/', authMiddleware, getHealthRecords);

// Get records by type (filter)
router.get('/type/:type', authMiddleware, getRecordsByType);

// Get patient's records (doctor view)
router.get('/patient/:patientId', authMiddleware, getPatientRecords);

// Get a specific health record
router.get('/:id', authMiddleware, getHealthRecordById);

// Create a new health record (doctor only)
router.post('/', authMiddleware, createHealthRecord);

// Update a health record (doctor only)
router.patch('/:id', authMiddleware, updateHealthRecord);

// Delete a health record (doctor only)
router.delete('/:id', authMiddleware, deleteHealthRecord);

// Add vital sign to a health record (doctor only)
router.post('/:id/vitals', authMiddleware, addVitalSign);

module.exports = router;