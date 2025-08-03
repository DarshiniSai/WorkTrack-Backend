const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');

router.post('/bulk-add', employeeController.addEmployeesFromCSV);
router.get('/', employeeController.getEmployees);
router.post('/', employeeController.addEmployee);
router.put('/:id', employeeController.updateEmployee);
router.get('/count', employeeController.getEmployeeCount);
router.delete('/:id', employeeController.deleteEmployee);
router.get('/distribution', employeeController.getDepartmentDistribution);
module.exports = router;
