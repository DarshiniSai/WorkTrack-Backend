const db = require('../config/db');
const fs = require('fs');
const bcrypt = require('bcrypt');

exports.getUserProfile = async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query(
      "SELECT id, name, email, phone, role, join_date, profile_image FROM users WHERE id = ?",
      [id]
    );
    if (rows.length === 0) return res.status(404).json({ message: "User not found" });

    const user = rows[0];
    if (user.profile_image) {
      user.profile_image = Buffer.from(user.profile_image).toString('base64');
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch profile", details: err.message });
  }
};

exports.updateUserProfile = async (req, res) => {
  const { id } = req.params;
  const { name, phone } = req.body;

  try {
    const fields = [];
    const values = [];

    if (name) { fields.push("name = ?"); values.push(name); }
    if (phone) { fields.push("phone = ?"); values.push(phone); }

    // Convert image to buffer
    if (req.file) {
      const imageBuffer = fs.readFileSync(req.file.path);
      fields.push("profile_image = ?");
      values.push(imageBuffer);
      // Optional: delete the temp file
      fs.unlinkSync(req.file.path);
    }

    if (fields.length === 0) {
      return res.status(400).json({ message: "No changes submitted" });
    }

    values.push(id);
    await db.query(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, values);

    res.json({ message: "Profile updated" });
  } catch (err) {
    console.error("Profile update error:", err);
    res.status(500).json({ error: "Failed to update profile", details: err.message });
  }
};

exports.changePassword = async (req, res) => {
  const { id } = req.params;
  const { currentPassword, newPassword } = req.body;

  try {
    const [rows] = await db.query("SELECT password FROM users WHERE id = ?", [id]);
    if (rows.length === 0) return res.status(404).json({ message: "User not found" });

    const match = await bcrypt.compare(currentPassword, rows[0].password);
    if (!match) return res.status(400).json({ message: "Current password is incorrect" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.query("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, id]);

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ error: "Failed to change password", details: err.message });
  }
};