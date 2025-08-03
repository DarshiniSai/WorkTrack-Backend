const db = require("../config/db");
const bcrypt = require("bcrypt");
const { sendWelcomeEmail, sendRemoveEmail } = require("../utils/mailer");

exports.addEmployee = async (req, res) => {
  const {name, email, department_id, salary } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: "Name and email are required" });
  }

  try {
    const defaultPassword = "Password123";
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    await db.execute(
      "INSERT INTO users (name, email, password, role, department_id, base_salary) VALUES (?, ?, ?, ?, ?, ?)",
      [name, email, hashedPassword, "employee", department_id, salary]
    );

    await sendWelcomeEmail(email, defaultPassword);
    res.status(201).json({ message: "Employee added and email sent." });
  } catch (error) {
    console.error("Add employee error:", error);
    if (error.code === "ER_DUP_ENTRY") {
      res.status(400).json({ error: "Email already exists" });
    } else {
      res.status(500).json({ error: "Error adding employee", details: error.message });
    }
  }
};

exports.addEmployeesFromCSV = async (req, res) => {
  const employees = req.body.employees;
  const defaultPassword = "Welcome123";
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  try {
    for (let emp of employees) {
      const { name, email, department_id, salary } = emp;

      await db.execute(
        "INSERT INTO users (name, email, password, role, department_id, base_salary) VALUES (?, ?, ?, ?, ?, ?)",
        [name, email, hashedPassword, "employee", department_id, salary]
      );

      await sendWelcomeEmail(email, defaultPassword);
    }

    res.status(201).json({ message: "All employees added and emails sent." });
  } catch (err) {
    console.error("CSV upload error:", err);
    res.status(500).json({ error: "Error processing CSV upload" });
  }
};

exports.getEmployees = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT u.id, u.name, u.email, u.base_salary AS salary, u.department_id, d.name AS department
       FROM users u
       LEFT JOIN departments d ON u.department_id = d.id
       WHERE u.role = 'employee'`
    );
    res.json(rows);
  } catch (err) {
    console.error("Get employees error:", err);
    res.status(500).json({ error: "Failed to fetch employees", details: err.message });
  }
};

exports.updateEmployee = async (req, res) => {
  const { id } = req.params;
  console.log(req.body);
  const { name, email, department_id, salary } = req.body;
  console.log("update empl" , name, email, salary, department_id);
  const safeDepartmentId = department_id === undefined || department_id === null || isNaN(department_id) ? null : parseInt(department_id);
  try {

    await db.execute(
      `UPDATE users SET name = ?, email = ?, department_id = ?, base_salary = ? WHERE id = ?`,
      [name, email, safeDepartmentId, salary, id]
    );
    res.json({ message: "Employee updated successfully" });
  } catch (err) {
    console.error("Update employee error:", err);
    res.status(500).json({ error: "Failed to update employee" });
  }
};

exports.deleteEmployee = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.execute(`SELECT name, email FROM users WHERE id = ?`, [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: "Employee not found" });
    }
    const { name, email } = rows[0]; // Destructure from the first row

    // Validate email
    if (!email || typeof email !== 'string' || email.trim() === '') {
      console.warn(`No valid email found for user ID ${id}, skipping email notification`);
    } else {
      await sendRemoveEmail(email, name);
    }
    await db.execute(`DELETE FROM users WHERE id = ?`, [id]);
    res.json({ message: "Employee deleted successfully" });
  } catch (err) {
    console.error("Delete employee error:", err);
    res.status(500).json({ error: "Failed to delete employee" });
  }
};
exports.getEmployeeCount = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT COUNT(*) as total FROM users WHERE role = 'employee'`
    );
    res.json({ total: rows[0].total });
  } catch (err) {
    console.error("Get employee count error:", err);
    res.status(500).json({ error: "Failed to fetch employee count", details: err.message });
  }
};

exports.getDepartmentDistribution = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT d.name, COUNT(u.id) as employee_count
       FROM departments d
       LEFT JOIN users u ON d.id = u.department_id AND u.role = 'employee'
       GROUP BY d.name`
    );
    const distribution = rows.reduce((acc, row) => {
      acc[row.name] = row.employee_count || 0;
      return acc;
    }, {});
    res.json(distribution);
  } catch (err) {
    console.error("Get department distribution error:", err);
    res.status(500).json({ error: "Failed to fetch department distribution", details: err.message });
  }
};