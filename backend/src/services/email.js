import nodemailer from 'nodemailer';

let transporter = null;

function getTransporter() {
  if (!transporter) {
    const port = parseInt(process.env.SMTP_PORT || '465', 10);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port,
      secure: port === 465,   // true for 465 (SSL), false for 587 (STARTTLS)
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      connectionTimeout: 30000,   // 30 s — Render can be slow to establish outbound TLS
      greetingTimeout: 30000,
      socketTimeout: 60000,
    });
  }
  return transporter;
}

export async function sendOTP(email, otp, purpose = 'verification') {
  const subjectMap = {
    login: 'SafeNotes - Login OTP',
    delete: 'SafeNotes - Delete Note OTP',
    register: 'SafeNotes - Registration OTP',
  };

  const messageMap = {
    login: `Your login OTP is: <strong>${otp}</strong><br><br>This code expires in 10 minutes. Do not share it with anyone.`,
    delete: `Your OTP to delete a note is: <strong>${otp}</strong><br><br>This code expires in 10 minutes. If you did not request this, ignore this email.`,
    register: `Your registration OTP is: <strong>${otp}</strong><br><br>This code expires in 10 minutes.`,
  };

  const mailOptions = {
    from: `"SafeNotes" <${process.env.SMTP_USER}>`,
    to: email || process.env.OWNER_EMAIL,
    subject: subjectMap[purpose] || 'SafeNotes - OTP',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; background: #f9f9f9; border-radius: 8px;">
        <h2 style="color: #333; margin-bottom: 16px;">SafeNotes Security</h2>
        <p style="color: #555; line-height: 1.6;">${messageMap[purpose] || messageMap.login}</p>
        <p style="color: #999; font-size: 12px; margin-top: 24px;">This is an automated message from SafeNotes.</p>
      </div>
    `,
  };

  await getTransporter().sendMail(mailOptions);
}

export async function verifyEmailConfig() {
  try {
    await getTransporter().verify();
    return true;
  } catch {
    transporter = null;   // reset so next attempt gets a fresh connection
    return false;
  }
}
