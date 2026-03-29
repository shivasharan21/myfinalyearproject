const express        = require('express');
const router         = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  getPrescriptions,
  getPrescriptionById,
  createPrescription,
  updatePrescription,
  deletePrescription,
  requestRefill,
  getPatientPrescriptions,
} = require('../controllers/prescriptionController');

// ─── Prescription Routes ──────────────────────────────────────────────────────

// Get all prescriptions (doctor/patient specific)
router.get('/', authMiddleware, getPrescriptions);

// Get prescriptions for a specific patient (doctor only)
router.get('/patient/:patientId', authMiddleware, getPatientPrescriptions);

// Get a specific prescription
router.get('/:id', authMiddleware, getPrescriptionById);

// Create a new prescription (doctor only)
router.post('/', authMiddleware, createPrescription);

// Update a prescription (doctor only)
router.patch('/:id', authMiddleware, updatePrescription);

// Delete a prescription (doctor only)
router.delete('/:id', authMiddleware, deletePrescription);

// Request refill (patient only)
router.post('/:id/refill', authMiddleware, requestRefill);

module.exports = router;