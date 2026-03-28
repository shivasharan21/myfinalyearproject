// backend/routes/prescriptions.js
const express = require('express');
const router = express.Router();
const {
  getPrescriptions,
  getPrescription,
  createPrescription,
  updatePrescription,
  dispensePrescription,
  requestRefill,
} = require('../controllers/prescriptionController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getPrescriptions)
  .post(createPrescription);

router.route('/:id')
  .get(getPrescription)
  .put(updatePrescription);

router.patch('/:id/dispense', dispensePrescription);
router.post('/:id/refill', requestRefill);

module.exports = router;