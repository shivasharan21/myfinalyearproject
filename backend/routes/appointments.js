const express        = require('express');
const router         = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  createAppointment,
  getAppointments,
  updateAppointment
} = require('../controllers/appointmentController');

router.post('/',     authMiddleware, createAppointment);
router.get('/',      authMiddleware, getAppointments);
router.patch('/:id', authMiddleware, updateAppointment);

module.exports = router;