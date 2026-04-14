const express        = require('express');
const router         = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  getReminders,
  getTodayReminders,
  createReminder,
  deleteReminder,
  logMedicine
} = require('../controllers/reminderController');

// IMPORTANT: /today must come before /:id so Express doesn't treat
// the literal string "today" as a MongoDB ObjectId.

router.get('/today',        authMiddleware, getTodayReminders);
router.get('/',             authMiddleware, getReminders);
router.post('/',            authMiddleware, createReminder);
router.post('/:id/log',     authMiddleware, logMedicine);
router.delete('/:id',       authMiddleware, deleteReminder);

module.exports = router;