const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.email,
    pass: process.env.password
  }
});

exports.sendWelcomeEmail = (email, defaultPassword) => {
  const mailOptions = {
    from: process.env.email,
    to: email,
    subject: 'Welcome to WorkTrack!',
    html: `
      <h3>Welcome to WorkTrack!</h3>
      <p>Your default password is: <strong>${defaultPassword}</strong></p>
      <p><a href="http://localhost:5000/index.html">Click here to login</a></p>
    `
  };

  return transporter.sendMail(mailOptions);
};

exports.sendRemoveEmail = (email, name) => {
  const mailOptions = {
    from: process.env.email,
    to: email,
    subject: 'Notification of Termination of Employment',
    html: `
      <p>Dear ${name},</p>
      <p>This email serves as formal notice of the termination of your employment with WorkTrack.</p>
    `
  };

  return transporter.sendMail(mailOptions);
};

exports.sendOTPEmail = (email, otp) => {
  const mailOptions = {
    from: process.env.email,
    to: email,
    subject: 'WorkTrack - Password Reset OTP',
    html: `
      <h3>OTP for Password Reset</h3>
      <p>Your One-Time Password (OTP) is: <strong>${otp}</strong></p>
      <p>This OTP is valid for a limited time only.</p>
    `
  };

  return transporter.sendMail(mailOptions);
};
