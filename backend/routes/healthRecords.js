// backend/routes/healthRecords.js
const express = require('express');
const router = express.Router();
const {
  getHealthRecords,
  getHealthRecord,
  createHealthRecord,
  updateHealthRecord,
  deleteHealthRecord,
  getVitalsTimeline,
} = require('../controllers/healthRecordController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.route('/')
  .get(getHealthRecords)
  .post(createHealthRecord);

router.get('/vitals/:patientId', getVitalsTimeline);

router.route('/:id')
  .get(getHealthRecord)
  .put(updateHealthRecord)
  .delete(deleteHealthRecord);

module.exports = router;