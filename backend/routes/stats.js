// backend/routes/stats.js
const express = require('express');
const router = express.Router();
const { getStats, getAdminStats } = require('../controllers/statsController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/', getStats);
router.get('/admin', authorize('admin'), getAdminStats);

module.exports = router;
