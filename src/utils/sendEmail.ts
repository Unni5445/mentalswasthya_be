import nodemailer from "nodemailer";
import dotenv from 'dotenv';

dotenv.config();

const sendEmail = async (to: string, subject: string, html: string, replyTo?: string) => {
  try {
    const port = parseInt(process.env.SMTP_PORT || '465');
    const isSecure = port === 465 || process.env.SMTP_SECURE === 'true';

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.hostinger.com',
      port,
      secure: isSecure,
      auth: {
        user: process.env.SMTP_USER || 'team@mentalswasthya.com',
        pass: process.env.SMTP_PASS || 'Teammental1234@',
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    const mailOptions: nodemailer.SendMailOptions = {
      from: process.env.SMTP_FROM || `"Mental Swasthya" <${process.env.SMTP_USER || 'team@mentalswasthya.com'}>`,
      to,
      subject,
      html,
      ...(replyTo ? { replyTo } : {}),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email Sent] To: ${to} | Subject: "${subject}" | MessageId: ${info?.messageId || info}`);
    return info;
  } catch (error) {
    console.error("[Email Error] Failed to send email:", error);
    return null;
  }
};

export default sendEmail;