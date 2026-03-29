const express        = require('express');
const router         = express.Router();
const authMiddleware = require('../middleware/auth');
const { getPrescriptions, createPrescription, requestRefill } = require('../controllers/prescriptionController');

router.get('/',          authMiddleware, getPrescriptions);
router.post('/',         authMiddleware, createPrescription);
router.post('/:id/refill', authMiddleware, requestRefill);

module.exports = router;