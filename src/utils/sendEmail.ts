import nodemailer from "nodemailer";
import { Address } from "nodemailer/lib/mailer";
import dotenv from 'dotenv'

dotenv.config()

const sendEmail = async (to: string, subject: string, text: string) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const mailOptions = {
    from: process.env.SMTP_USER,
    to,
    subject,
    html: text,
  };

  transporter.sendMail(mailOptions, (error, result) => {
    if (error) {
      console.log(error);
    } else {
      console.log("Email sent: " + result);
    }
  });
};

export default sendEmail;