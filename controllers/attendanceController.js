const db = require('../config/db');
const { Parser } = require('json2csv');

const getToday = () => new Date().toISOString().slice(0, 10);

exports.checkIn = async (req, res) => {
  const { user_id } = req.body;
  const today = getToday();
  const timeNow = new Date().toTimeString().slice(0, 8); // HH:MM:SS

  try {
    const [existing] = await db.query(
      "SELECT * FROM attendance WHERE user_id = ? AND date = ?",
      [user_id, today]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: "Already checked in today" });
    }

    await db.query(
      "INSERT INTO attendance (user_id, date, check_in, status) VALUES (?, ?, ?, 'Present')",
      [user_id, today, timeNow]
    );

    res.json({ message: "✅ Checked in successfully" });
  } catch (err) {
    console.error("Check-in error:", err);
    res.status(500).json({ message: "Server error during check-in" });
  }
};

exports.checkOut = async (req, res) => {
  const { user_id } = req.body;
  const today = getToday();
  const now = new Date();

  try {
    const [rows] = await db.query(
      "SELECT * FROM attendance WHERE user_id = ? AND date = ?",
      [user_id, today]
    );

    if (rows.length === 0) {
      return res.status(400).json({ message: "⚠️ You haven't checked in today" });
    }

    const checkInTime = new Date(`${today}T${rows[0].check_in}`);
    const checkOutTime = now.toTimeString().slice(0, 8);
    const hoursWorked = (now - checkInTime) / (1000 * 60 * 60);

    let status = "Absent";
    if (hoursWorked >= 8) {
      status = "Present";
    }

    await db.query(
      "UPDATE attendance SET check_out = ?, status = ? WHERE user_id = ? AND date = ?",
      [checkOutTime, status, user_id, today]
    );

    res.json({ message: "✅ Checked out successfully" });
  } catch (err) {
    console.error("Check-out error:", err);
    res.status(500).json({ message: "Server error during check-out" });
  }
};

exports.getAttendanceByUser = async (req, res) => {
  const { user_id } = req.params;
  const { month, year } = req.query;

  try {
    let query = `
      SELECT a.*, u.name as employee_name
      FROM attendance a
      JOIN users u ON a.user_id = u.id
      WHERE a.user_id = ?
    `;
    const params = [user_id];

    if (month && year) {
      query += " AND MONTH(a.date) = ? AND YEAR(a.date) = ?";
      params.push(parseInt(month), parseInt(year));
    } else if (month) {
      query += " AND MONTH(a.date) = ?";
      params.push(parseInt(month));
    } else if (year) {
      query += " AND YEAR(a.date) = ?";
      params.push(parseInt(year));
    }

    query += " ORDER BY a.date DESC";

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error("Get attendance by user error:", err);
    res.status(500).json({ error: "Failed to fetch attendance records", details: err.message });
  }
};

exports.getAttendanceSummary = async (req, res) => {
  const { user_id } = req.params;

  try {
    const [workingDaysResult] = await db.query(`
      SELECT COUNT(*) AS working_days
      FROM (
        SELECT a.date
        FROM attendance a
        WHERE a.user_id = ?
        AND DAYOFWEEK(a.date) != 1  -- Skip Sundays (1 = Sunday)
        GROUP BY a.date
      ) AS working_days
    `, [user_id]);

    const workingDays = workingDaysResult[0]?.working_days || 0;
    const [counts] = await db.query(`
      SELECT status, COUNT(*) as count
      FROM attendance
      WHERE user_id = ?
      GROUP BY status
    `, [user_id]);

    const summary = { workingDays, present: 0, absent: 0, pending: 0 };

    counts.forEach(row => {
      const status = row.status.toLowerCase();
      summary[status] = row.count;
    });

    res.json(summary);
  } catch (err) {
    console.error("Error fetching attendance summary:", err);
    res.status(500).json({ error: "Failed to fetch attendance summary" });
  }
};

exports.getAllAttendance = async (req, res) => {
  try {
    const { employee, department, date, status } = req.query;
    let query = `
      SELECT a.*, u.name, d.name AS department
      FROM attendance a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE 1=1
    `;
    const params = [];

    if (employee) {
      query += ' AND u.name LIKE ?';
      params.push(`%${employee}%`);
    }
    if (department) {
      query += ' AND d.name = ?';
      params.push(department);
    }
    if (date) {
      query += ' AND a.date = ?';
      params.push(date);
    }
    if (status) {
      query += ' AND a.status = ?';
      params.push(status);
    }

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error("Fetch error:", err);
    res.status(500).json({ error: "Failed to fetch attendance" });
  }
};

exports.updateAttendance = async (req, res) => {
  const { id } = req.params;
  const { status, check_in, check_out } = req.body;

  try {
    await db.query(
      "UPDATE attendance SET status = ?, check_in = ?, check_out = ? WHERE id = ?",
      [status, check_in, check_out, id]
    );
    res.json({ message: "Attendance updated" });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ error: "Failed to update attendance" });
  }
};

exports.exportAttendance = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT u.name, d.name AS department, a.date, a.check_in, a.check_out, a.status
      FROM attendance a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN departments d ON u.department_id = d.id
    `);

    const parser = new Parser();
    const csv = parser.parse(rows);

    res.header('Content-Type', 'text/csv');
    res.attachment('attendance_export.csv');
    res.send(csv);
  } catch (err) {
    console.error("Export error:", err);
    res.status(500).json({ error: "Failed to export attendance" });
  }
};
