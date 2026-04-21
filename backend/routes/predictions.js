const express        = require('express');
const router         = express.Router();
const multer         = require('multer');
const authMiddleware = require('../middleware/auth');
const {
  predictDiabetes,
  getDiabetesPredictions,
  predictHeartDisease,
  getHeartPredictions,
  predictPneumonia,
  getPneumoniaPredictions
} = require('../controllers/predictionController');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/predict-diabetes',       authMiddleware, predictDiabetes);
router.get('/predictions',             authMiddleware, getDiabetesPredictions);
router.post('/predict-heart-disease',  authMiddleware, predictHeartDisease);
router.get('/heart-predictions',       authMiddleware, getHeartPredictions);
router.post('/predict-pneumonia',      authMiddleware, upload.single('image'), predictPneumonia);
router.get('/pneumonia-predictions',   authMiddleware, getPneumoniaPredictions);

module.exports = router;