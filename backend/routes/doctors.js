// backend/routes/doctors.js
const express = require('express');
const router = express.Router();
const {
  getDoctors,
  getDoctor,
  getAvailableSlots,
  getDoctorPatients,
} = require('../controllers/doctorController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', getDoctors);
router.get('/patients', getDoctorPatients);
router.get('/:id', getDoctor);
router.get('/:id/slots', getAvailableSlots);

module.exports = router;
