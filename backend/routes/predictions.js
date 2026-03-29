const express        = require('express');
const router         = express.Router();
const authMiddleware = require('../middleware/auth');
const {
  predictDiabetes,
  getDiabetesPredictions,
  predictHeartDisease,
  getHeartPredictions
} = require('../controllers/predictionController');

router.post('/predict-diabetes',       authMiddleware, predictDiabetes);
router.get('/predictions',             authMiddleware, getDiabetesPredictions);
router.post('/predict-heart-disease',  authMiddleware, predictHeartDisease);
router.get('/heart-predictions',       authMiddleware, getHeartPredictions);

module.exports = router;