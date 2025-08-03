const express = require('express');
const router = express.Router();
const attendanceController = require('../controllers/attendanceController');

router.post('/checkin', attendanceController.checkIn);
router.post('/checkout', attendanceController.checkOut);
router.get('/user/:user_id', attendanceController.getAttendanceByUser);
router.get('/summary/:user_id', attendanceController.getAttendanceSummary);
router.get('/admin', attendanceController.getAllAttendance);
router.put('/:id', attendanceController.updateAttendance);
router.get('/admin/export', attendanceController.exportAttendance);

module.exports = router;