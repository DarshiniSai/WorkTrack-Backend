const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/login', authController.login);
router.post('/google-login', authController.googleLogin);
router.post('/forgot-password', authController.sendForgotPasswordOTP);
router.post('/verify-otp', authController.verifyOTPAndResetPassword);

module.exports = router;
