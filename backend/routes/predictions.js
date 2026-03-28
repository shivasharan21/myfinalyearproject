// backend/routes/predictions.js
const express = require('express');
const router = express.Router();
const {
  predictDiabetes,
  getDiabetisHistory,
  predictHeartDisease,
  getHeartHistory,
  getPredictionSummary,
} = require('../controllers/predictionController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/predict-diabetes', predictDiabetes);
router.get('/predictions', getDiabetisHistory);
router.post('/predict-heart-disease', predictHeartDisease);
router.get('/heart-predictions', getHeartHistory);
router.get('/predictions/summary', getPredictionSummary);

module.exports = router;
