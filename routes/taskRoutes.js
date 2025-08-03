const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');

router.get('/user/:user_id', taskController.getTasksByUser);
router.post('/', taskController.createTask);
router.put('/status/:id', taskController.updateTaskStatus);
router.put("/:id", taskController.updateTask);   
router.delete("/:id", taskController.deleteTask); 
router.get("/all-tasks", taskController.getAllTasks);

module.exports = router;
