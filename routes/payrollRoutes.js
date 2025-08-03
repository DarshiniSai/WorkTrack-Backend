const express = require('express');
const router = express.Router();
const controller = require('../controllers/payrollController');

router.get('/', controller.getPayrolls);
router.get('/preview', controller.previewPayroll);
router.post('/generate', controller.savePayroll);
router.get('/employee/:id', controller.getPayrollsByEmployee);
router.get('/status', controller.checkPayrollStatus);

module.exports = router;