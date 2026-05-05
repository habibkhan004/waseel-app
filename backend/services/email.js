const nodemailer = require("nodemailer")

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM, FRONTEND_URL } = process.env

let transporter

function getTransporter() {
  if (transporter) return transporter

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !EMAIL_FROM) {
    console.warn("Email is not fully configured. Missing SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS/EMAIL_FROM.")
    return null
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  })

  return transporter
}

async function sendPasswordResetEmail(to, token) {
  const baseUrl = FRONTEND_URL || "http://localhost:5173"
  const resetUrl = `${String(baseUrl).replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`

  const t = getTransporter()
  if (!t) {
    console.warn("Transporter not available, skipping email send. Reset URL:", resetUrl)
    return { skipped: true, resetUrl }
  }

  const mailOptions = {
    from: EMAIL_FROM,
    to,
    subject: "Reset your Waseel AI password",
    html: `
      <p>Hello,</p>
      <p>We received a request to reset your password.</p>
      <p>Click the link below to choose a new password:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>If you did not request this, you can safely ignore this email.</p>
    `,
  }

  try {
    const info = await t.sendMail(mailOptions)
    console.log("Password reset email sent:", info.messageId)
    return { resetUrl }
  } catch (err) {
    console.error("Error sending password reset email:", err?.message || err)
    throw err
  }
}

module.exports = { sendPasswordResetEmail }

