const express        = require('express');
const router         = express.Router();
const authMiddleware = require('../middleware/auth');
const { getDoctors } = require('../controllers/doctorController');

router.get('/', authMiddleware, getDoctors);

module.exports = router;