const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/adminAttendanceController');

router.get('/', attendanceController.getAllAttendance);
router.put('/:id', attendanceController.updateAttendance);
router.get('/export', attendanceController.exportAttendance);

module.exports = router;
