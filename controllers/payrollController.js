const db = require("../config/db");

exports.getPayrolls = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        p.id AS payroll_id,
        p.month,
        p.year,
        p.base_salary,
        p.bonus,
        p.total_pay,
        u.base_salary AS full_salary,
        u.name AS employee_name,
        d.name AS department,
        (
          SELECT COUNT(*) FROM attendance a
          WHERE a.user_id = u.id
            AND a.status = 'Present'
            AND MONTH(a.date) = p.month
            AND YEAR(a.date) = p.year
        ) AS days_present
      FROM payroll p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN departments d ON u.department_id = d.id
      ORDER BY p.year DESC, p.month DESC
    `);

    // Optional: You can format the result as needed here
    const payrolls = rows.map(p => ({
      id: `PR-${p.payroll_id.toString().padStart(3, "0")}`,
      month: p.month,
      year: p.year,
      base: p.base_salary,
      bonus: p.bonus,
      net: p.total_pay,
      fullSalary: p.full_salary,
      name: (p.employee_name || "").trim(),
      department: (p.department || "N/A").trim(),
      presentDays: p.days_present
    }));

    res.json(payrolls);
  } catch (err) {
    console.error("Admin payroll fetch error:", err);
    res.status(500).json({ error: "Failed to load payrolls" });
  }
};

exports.previewPayroll = async (req, res) => {
  const { month, year, bonus = 0 } = req.query;

  try {
    const [rows] = await db.query(`
      SELECT u.id AS employee_id, u.name, d.name AS department, u.base_salary,
        COUNT(a.id) AS days_present
      FROM users u
      LEFT JOIN departments d ON u.department_id = d.id
      LEFT JOIN attendance a ON a.user_id = u.id
        AND MONTH(a.date) = ? AND YEAR(a.date) = ? AND a.status = 'Present'
      WHERE u.role = 'Employee'
      GROUP BY u.id
    `, [month, year]);

    const missingSalary = rows
      .filter(e => !e.base_salary || e.base_salary <= 0)
      .map(e => e.name);
    if (missingSalary.length > 0) {
      return res.status(400).json({
        error: `Base salary missing for: ${missingSalary.join(", ")}. Please update before generating payroll.`
      });
    }

    const preview = rows.map(emp => {
      const workingDays = getWorkingDays(parseInt(month), parseInt(year));
      const paidLeaves = 2;
      const unpaidLeaves = Math.max(0, workingDays - emp.days_present - paidLeaves);
      const perDay = emp.base_salary / workingDays;
      const leaveDeduction = unpaidLeaves * perDay;
      const adjustedBase = emp.base_salary - leaveDeduction;
      const fixedBonus = parseFloat(bonus);

      return {
        employee_id: emp.employee_id,
        name: emp.name.trim(),
        department: (emp.department || 'N/A').trim(),
        month: parseInt(month),
        year: parseInt(year),
        base_salary: Math.round(adjustedBase),
        days_present: emp.days_present,
        bonus: fixedBonus,
        total_pay: Math.round(adjustedBase + fixedBonus)
      };
    });

    res.json(preview);
  } catch (err) {
    console.error("Payroll preview error:", err);
    res.status(500).json({ error: "Failed to preview payroll" });
  }
};

function getWorkingDays(month, year) {
  const date = new Date(year, month - 1, 1);
  let count = 0;
  while (date.getMonth() === month - 1) {
    const day = date.getDay();
    if (day !== 0) count++;
    date.setDate(date.getDate() + 1);
  }
  return count;
}

exports.savePayroll = async (req, res) => {
  const payrolls = req.body;
  if (!Array.isArray(payrolls) || payrolls.length === 0) {
    return res.status(400).json({ error: "Invalid payroll data" });
  }

  const { month, year } = payrolls[0];

  try {
    const [existing] = await db.query(
      "SELECT COUNT(*) AS count FROM payroll WHERE month = ? AND year = ?",
      [month, year]
    );

    if (existing[0].count > 0) {
      return res.status(409).json({ error: `Payroll already generated for ${month}/${year}` });
    }

    for (const p of payrolls) {
      await db.query(`
        INSERT INTO payroll (user_id, month, year, base_salary, bonus, total_pay)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [p.employee_id, p.month, p.year, p.base_salary, p.bonus, p.total_pay]);
    }

    res.json({ message: "Payroll saved successfully" });
  } catch (err) {
    console.error("Payroll save error:", err);
    res.status(500).json({ error: "Failed to save payroll" });
  }
};

exports.getPayrollsByEmployee = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.query(`
      SELECT 
        p.id AS payroll_id,
        p.month,
        p.year,
        p.base_salary,
        p.bonus,
        p.total_pay,
        u.base_salary AS full_salary,
        u.name AS employee_name,
        d.name AS department
      FROM payroll p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.id = ?
      ORDER BY year DESC, month DESC
    `, [id]);

    const payrolls = rows.map(p => {
      const deductions = (p.full_salary || 0) - (p.base_salary || 0);
      return {
        id: `PR-${p.payroll_id.toString().padStart(3, "0")}`,
        month: monthName(p.month),
        year: p.year,
        base: p.base_salary,
        deductions: deductions,
        net: p.total_pay,
        status: "Paid",
        name: (p.employee_name || "").trim(),
        department: (p.department || "N/A").trim()
      };
    });

    res.json(payrolls);
  } catch (err) {
    console.error("Employee payroll fetch error:", err);
    res.status(500).json({ error: "Failed to fetch payroll data" });
  }
};

function monthName(monthNumber) {
  const names = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  return names[monthNumber] || "";
}

exports.checkPayrollStatus = async (req, res) => {
  const { month, year } = req.query;
  try {
    const [rows] = await db.query(
      "SELECT COUNT(*) as count FROM payroll WHERE month = ? AND year = ?",
      [month, year]
    );
    const alreadyGenerated = rows[0].count > 0;
    res.json({ alreadyGenerated });
  } catch (err) {
    console.error("Payroll status check error:", err);
    res.status(500).json({ error: "Failed to check payroll status" });
  }
};
