const express        = require('express');
const router         = express.Router();
const authMiddleware = require('../middleware/auth');
const { register, login, getMe, updateProfile } = require('../controllers/authController');

router.post('/register',       register);
router.post('/login',          login);
router.get('/me',              authMiddleware, getMe);
router.put('/profile',         authMiddleware, updateProfile);

module.exports = router;