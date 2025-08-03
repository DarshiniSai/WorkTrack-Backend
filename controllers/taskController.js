const db = require('../config/db');

exports.getTasksByUser = async (req, res) => {
  const { user_id } = req.params;

  try {
    const [tasks] = await db.query('SELECT * FROM tasks WHERE user_id = ?', [user_id]);
    res.json(tasks);
  } catch (err) {
    console.error("Error fetching tasks:", err);
    res.status(500).json({ error: 'Error fetching tasks' });
  }
};

exports.createTask = async (req, res) => {
  const { user_id, description, due_date } = req.body;

  if (!user_id || !description) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    await db.query(
      "INSERT INTO tasks (user_id, description, status, due_date) VALUES (?, ?, 'Pending', ?)",
      [user_id, description, due_date]
    );
    res.json({ message: "Task assigned successfully" });
  } catch (err) {
    console.error("Task creation error:", err);
    res.status(500).json({ error: "Failed to assign task" });
  }
};

exports.updateTaskStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    await db.query('UPDATE tasks SET status = ? WHERE id = ?', [status, id]);
    res.json({ message: 'Task updated' });
  } catch (err) {
    console.error("Error updating task:", err);
    res.status(500).json({ error: 'Error updating task' });
  }
};

exports.updateTask = async (req, res) => {
  const { id } = req.params;
  const { description } = req.body;
  console.log("description", description);

  try {
    const [rows] = await db.query("SELECT * FROM tasks WHERE id = ?", [id]);
    if (rows.length === 0) return res.status(404).json({ message: "Task not found" });

    const existing = rows[0];

    const updatedDescription = description !== undefined ? description : existing.description;
    await db.query(
      "UPDATE tasks SET description = ? WHERE id = ?",
      [updatedDescription, id]
    );

    res.json({ message: "Task updated" });
  } catch (err) {
    console.error("Update task error:", err);
    res.status(500).json({ error: "Error updating task" });
  }
};

exports.deleteTask = async (req, res) => {
  const { id } = req.params;

  try {
    await db.query("DELETE FROM tasks WHERE id = ?", [id]);
    res.json({ message: "Task deleted" });
  } catch (err) {
    console.error("Delete task error:", err);
    res.status(500).json({ error: "Error deleting task" });
  }
};

exports.getAllTasks = async (req, res) => {
  try {
    const [tasks] = await db.query(`
      SELECT 
        t.id, 
        t.description, 
        t.status, 
        t.due_date, 
        u.id AS user_id, 
        u.name AS employee_name, 
        d.name AS department
      FROM tasks t
      JOIN users u ON t.user_id = u.id
      LEFT JOIN departments d ON u.department_id = d.id
      ORDER BY t.due_date DESC
    `);
    res.json(tasks);
  } catch (err) {
    console.error("Error fetching all tasks:", err);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
};