const db = require('../config/db');
const bcrypt = require('bcrypt');
const mailer = require('../utils/mailer'); // <-- Make sure this is the correct path

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const [results] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (results.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: 'Server error during login' });
  }
};

exports.googleLogin = async (req, res) => {
  const { email } = req.body;

  try {
    const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);

    if (rows.length === 0) {
      return res.status(401).json({ message: "Email not registered. Please contact admin." });
    }

    const user = rows[0];
    res.json({ user });

  } catch (error) {
    console.error("Google login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.sendForgotPasswordOTP = async (req, res) => {
  const { email } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    if (rows.length === 0) return res.status(404).json({ error: "User not found" });

    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry
    await db.query(
      "UPDATE users SET reset_otp = ?, reset_otp_expires = ? WHERE email = ?",
      [otp, expires, email]
    );

    await mailer.sendOTPEmail(email, otp); // ✅ Use mailer module
    res.json({ message: "OTP sent successfully" });

  } catch (err) {
    console.error("Error sending OTP:", err);
    res.status(500).json({ error: "Failed to send OTP" });
  }
};

exports.verifyOTPAndResetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;

  try {
    const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    if (rows.length === 0) return res.status(404).json({ error: "User not found" });

    const user = rows[0];
    const now = new Date();

    if (!user.reset_otp || !user.reset_otp_expires || user.reset_otp !== otp || new Date(user.reset_otp_expires) < now) {
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.query("UPDATE users SET password = ?, reset_otp = NULL, reset_otp_expires = NULL WHERE email = ?", [hashedPassword, email]);

    res.json({ message: "Password updated successfully" });

  } catch (err) {
    console.error("Password reset error:", err);
    res.status(500).json({ error: "Failed to reset password" });
  }
};
