const express = require('express');
const router = express.Router();
const { register, login, getProfile } = require('../controllers/authController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.post('/login', login);

router.post('/register', protect, adminOnly, register);
router.get('/profile', protect, getProfile);

module.exports = router;
