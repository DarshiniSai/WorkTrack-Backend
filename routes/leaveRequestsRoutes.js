const express = require('express');
const router = express.Router();
const controller = require('../controllers/leaveRequestsController');

router.get('/', controller.getLeaveRequests);
router.put('/:id/status', controller.updateLeaveStatus);
router.get('/pending-count', controller.getPendingLeaveRequestsCount);
router.get('/summary', controller.getLeaveSummary);
router.get('/user/:userId', controller.getLeaveRequestsByUser);
router.post('/', controller.createLeaveRequest);
router.put('/:id', controller.updateLeaveRequest);
router.delete('/:id', controller.deleteLeaveRequest);

module.exports = router;
