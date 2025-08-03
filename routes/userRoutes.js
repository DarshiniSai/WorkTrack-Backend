const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const upload = require('../middleware/upload');

router.get('/:id', userController.getUserProfile);
router.put('/:id', upload.single('profile'), userController.updateUserProfile);
router.put('/:id/change-password', userController.changePassword);
router.post('/:id/change-password', userController.changePassword);

module.exports = router;
