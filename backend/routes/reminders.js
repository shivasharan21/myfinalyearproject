// backend/routes/reminders.js
const express = require('express');
const router = express.Router();
const {
  getReminders,
  createReminder,
  updateReminder,
  logMedicine,
  deleteReminder,
  getTodaySchedule,
} = require('../controllers/reminderController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/today', getTodaySchedule);

router.route('/')
  .get(getReminders)
  .post(createReminder);

router.route('/:id')
  .put(updateReminder)
  .delete(deleteReminder);

router.post('/:id/log', logMedicine);

module.exports = router;
