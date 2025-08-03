const db = require('../config/db');

exports.addDepartment = async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Department name is required' });

  try {
    await db.query('INSERT INTO departments (name) VALUES (?)', [name]);
    res.status(201).json({ message: 'Department added' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add department' });
  }
};

exports.deleteDepartment = async (req, res) => {
  const id = req.params.id;
  try {
    await db.query('DELETE FROM departments WHERE id = ?', [id]);
    res.status(200).json({ message: 'Department deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete department' });
  }
};

exports.getDepartments = async (req, res) => {
  try {
    const [departments] = await db.query(`
      SELECT 
        d.id,
        d.name, 
        COUNT(u.id) AS employee_count
      FROM departments d
      LEFT JOIN users u ON u.department_id = d.id
      GROUP BY d.id, d.name
      ORDER BY d.name
    `);
    res.json(departments);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch departments' });
  }
};

exports.updateDepartment = async (req, res) => {
  const id = req.params.id;
  const { name } = req.body;

  if (!name) return res.status(400).json({ error: 'Department name is required' });

  try {
    const [result] = await db.query(
      'UPDATE departments SET name = ? WHERE id = ?',
      [name, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Department not found' });
    }

    res.status(200).json({ message: 'Department updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update department' });
  }
};

exports.getDepartmentCount = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT COUNT(*) as total FROM departments`
    );
    res.json({ total: rows[0].total });
  } catch (err) {
    console.error("Get department count error:", err);
    res.status(500).json({ error: "Failed to fetch department count", details: err.message });
  }
};