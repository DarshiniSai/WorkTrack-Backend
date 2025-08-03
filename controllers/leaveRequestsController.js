const pool = require('../config/db');

exports.getLeaveRequests = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT lr.id, lr.employee_id, u.name as employee, d.name as department, lr.type, lr.start_date, lr.end_date, lr.status, lr.description
      FROM leave_requests lr
      JOIN users u ON lr.employee_id = u.id
      LEFT JOIN departments d ON u.department_id = d.id
      ORDER BY lr.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch leave requests' });
  }
};

exports.updateLeaveStatus = async (req, res) => {
  const id = req.params.id;
  const { status, admin_remark } = req.body;

  if (!['Approved', 'Rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }

  try {
    await pool.query(
      `UPDATE leave_requests SET status = ?, admin_remark = ? WHERE id = ?`,
      [status, admin_remark || null, id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update leave request status' });
  }
};

exports.getPendingLeaveRequestsCount = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT COUNT(*) as total FROM leave_requests WHERE status = 'Pending'`
    );
    res.json({ total: rows[0].total });
  } catch (err) {
    console.error("Get pending leave requests count error:", err);
    res.status(500).json({ error: "Failed to fetch pending leave requests count", details: err.message });
  }
};

exports.getLeaveSummary = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT status, COUNT(*) as count
       FROM leave_requests
       GROUP BY status`
    );
    const summary = rows.reduce((acc, row) => {
      acc[row.status.toLowerCase()] = row.count;
      return acc;
    }, { approved: 0, pending: 0, rejected: 0 });
    res.json(summary);
  } catch (err) {
    console.error("Get leave summary error:", err);
    res.status(500).json({ error: "Failed to fetch leave summary", details: err.message });
  }
};

exports.getLeaveRequestsByUser = async (req, res) => {
  const userId = req.params.userId;
  try {
    const [rows] = await pool.query(
      `SELECT start_date, end_date, description, status FROM leave_requests WHERE employee_id = ? ORDER BY end_date DESC`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch leave requests' });
  }
};

exports.createLeaveRequest = async (req, res) => {
  const { user_id, from_date, to_date, reason } = req.body;
  try {
    await pool.query(
      `INSERT INTO leave_requests (employee_id, type, start_date, end_date, description) VALUES (?, ?, ?, ?, ?)`,
      [user_id, reason, from_date, to_date, reason]
    );
    res.json({ message: 'Leave request submitted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit request' });
  }
};

exports.updateLeaveRequest = async (req, res) => {
  const id = req.params.id;
  const { from_date, to_date, reason } = req.body;
  try {
    await pool.query(
      `UPDATE leave_requests SET start_date = ?, end_date = ?, description = ? WHERE employee_id = ? AND status = 'Pending'`,
      [from_date, to_date, reason, id]
    );
    res.json({ message: 'Leave updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update leave request' });
  }
};

exports.deleteLeaveRequest = async (req, res) => {
  const id = req.params.id;
  try {
    await pool.query(`DELETE FROM leave_requests WHERE employee_id = ? AND status = 'Pending'`, [id]);
    res.json({ message: 'Leave deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete leave request' });
  }
};
