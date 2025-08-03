const express = require('express');
const router = express.Router();
const controller = require('../controllers/departmentsController');

router.get('/', controller.getDepartments);
router.post('/', controller.addDepartment);
router.get('/count', controller.getDepartmentCount);
router.delete('/:id', controller.deleteDepartment);
router.put('/:id', controller.updateDepartment);

module.exports = router;
