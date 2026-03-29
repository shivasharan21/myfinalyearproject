const express        = require('express');
const router         = express.Router();
const authMiddleware = require('../middleware/auth');
const { getStats }   = require('../controllers/statsController');

router.get('/', authMiddleware, getStats);

module.exports = router;