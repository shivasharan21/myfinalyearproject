const express       = require('express');
const router        = express.Router();
const authMiddleware = require('../middleware/auth');
const { getHealthRecords, createHealthRecord } = require('../controllers/healthRecordController');

router.get('/',  authMiddleware, getHealthRecords);
router.post('/', authMiddleware, createHealthRecord);

module.exports = router;