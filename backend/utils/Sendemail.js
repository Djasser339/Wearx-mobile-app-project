const nodemailer = require("nodemailer");

// One reusable "mailer" built from your .env SMTP settings. This works
// with Gmail (using an App Password, not your real password), Mailtrap
// (a free service that catches test emails without really sending them —
// great while developing), or any other SMTP provider.
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: Number(process.env.EMAIL_PORT) === 465, // true only for port 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const sendEmail = async ({ to, subject, html }) => {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to,
    subject,
    html,
  });
};

module.exports = sendEmail;