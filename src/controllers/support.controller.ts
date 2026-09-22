import { Request, Response, NextFunction } from 'express';
import asyncHandler from '../utils/asyncHandler';
import ApiResponse from '../utils/ApiResponse';
import ErrorResponse from '../utils/errorResponse';
import SupportMessage from '../models/support.model';
import sendEmail from '../utils/sendEmail';

class SupportController {
  static submitContact = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { name, email, subject, message } = req.body;

      if (!name || !email || !message) {
        return next(new ErrorResponse('Please provide name, email, and message', 400));
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return next(new ErrorResponse('Please provide a valid email address', 400));
      }

      const sanitizedSubject = (subject || 'General Inquiry').trim();

      // 1. Save message to database
      const supportEntry = await SupportMessage.create({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        subject: sanitizedSubject,
        message: message.trim(),
      });

      const supportEmail = process.env.SUPPORT_EMAIL || 'support@mentalswasthya.com';

      // 2. Dispatch email notification to Support Team
      const adminHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e1eadb;">
          <div style="background: linear-gradient(135deg, #1c3217 0%, #2f4e28 100%); padding: 28px 32px; color: #ffffff;">
            <p style="margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #a8c896; font-weight: 700;">Mental Swasthya Support Hub</p>
            <h1 style="margin: 8px 0 0; font-size: 22px; font-weight: 700; color: #ffffff;">New Contact Inquiry Received</h1>
          </div>
          <div style="padding: 32px;">
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
              <tr>
                <td style="padding: 8px 0; color: #66785c; font-size: 13px; width: 100px; font-weight: 600;">From:</td>
                <td style="padding: 8px 0; color: #1c3217; font-size: 14px; font-weight: 700;">${name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #66785c; font-size: 13px; font-weight: 600;">Email:</td>
                <td style="padding: 8px 0; color: #1c3217; font-size: 14px;"><a href="mailto:${email}" style="color: #436e35; font-weight: 600; text-decoration: none;">${email}</a></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #66785c; font-size: 13px; font-weight: 600;">Subject:</td>
                <td style="padding: 8px 0; color: #1c3217; font-size: 14px; font-weight: 600;">${sanitizedSubject}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #66785c; font-size: 13px; font-weight: 600;">Submitted:</td>
                <td style="padding: 8px 0; color: #1c3217; font-size: 13px;">${new Date().toLocaleString()}</td>
              </tr>
            </table>

            <div style="background: #f7faf5; border-left: 4px solid #7d9667; padding: 18px 20px; border-radius: 8px; margin-bottom: 24px;">
              <p style="margin: 0 0 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #7d9667; font-weight: 700;">Message Content:</p>
              <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #22331b; white-space: pre-wrap;">${message.trim()}</p>
            </div>

            <p style="font-size: 12px; color: #8a9a80; margin: 0; line-height: 1.5;">
              You can reply directly to this email to respond to <strong>${email}</strong>.
            </p>
          </div>
          <div style="background: #f4f8f1; padding: 16px 32px; border-top: 1px solid #e1eadb; font-size: 11px; color: #8a9a80; text-align: center;">
            Mental Swasthya &bull; <a href="https://mentalswasthya.com" style="color: #436e35; text-decoration: none;">mentalswasthya.com</a> &bull; Ticket ID: ${supportEntry._id}
          </div>
        </div>
      `;

      // Dispatch to support inbox (replyTo set to the user's email)
      sendEmail(
        supportEmail,
        `[Inquiry: ${sanitizedSubject}] from ${name}`,
        adminHtml,
        email
      ).catch((err) => console.error('[Support Email] Error sending to support:', err));

      // 3. Dispatch automated confirmation receipt to user
      const userHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e1eadb;">
          <div style="background: linear-gradient(135deg, #1c3217 0%, #2f4e28 100%); padding: 32px; text-align: center; color: #ffffff;">
            <p style="margin: 0; font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: #a8c896; font-weight: 700;">Mental Swasthya</p>
            <h1 style="margin: 10px 0 0; font-size: 24px; font-weight: 700; color: #ffffff;">We Received Your Message</h1>
          </div>
          <div style="padding: 32px 36px;">
            <p style="font-size: 15px; color: #22331b; line-height: 1.6; margin-top: 0;">
              Hello <strong>${name}</strong>,
            </p>
            <p style="font-size: 14px; color: #4b5e43; line-height: 1.6;">
              Thank you for reaching out to Mental Swasthya. We have received your inquiry regarding <strong>"${sanitizedSubject}"</strong>.
            </p>
            <div style="background: #f7faf5; border-radius: 12px; padding: 20px; border: 1px solid #e1eadb; margin: 24px 0;">
              <p style="margin: 0 0 8px; font-size: 12px; font-weight: 700; color: #7d9667; text-transform: uppercase; letter-spacing: 1px;">Summary of your message:</p>
              <p style="margin: 0; font-size: 13px; color: #33442a; line-height: 1.6; white-space: pre-wrap;">${message.trim()}</p>
            </div>
            <p style="font-size: 14px; color: #4b5e43; line-height: 1.6;">
              Our dedicated care specialists review inquiries daily and aim to reply within <strong>24 hours</strong>. If your matter is urgent, you may also reach us directly at <a href="mailto:${supportEmail}" style="color: #436e35; font-weight: 600; text-decoration: none;">${supportEmail}</a>.
            </p>
            <p style="font-size: 14px; color: #22331b; margin-top: 28px; line-height: 1.6;">
              Wishing you peace and wellness,<br>
              <strong>Mental Swasthya Support Team</strong>
            </p>
          </div>
          <div style="background: #f4f8f1; padding: 18px 32px; border-top: 1px solid #e1eadb; font-size: 12px; color: #8a9a80; text-align: center;">
            &copy; ${new Date().getFullYear()} Mental Swasthya. All rights reserved. &bull; <a href="mailto:${supportEmail}" style="color: #436e35; text-decoration: none;">${supportEmail}</a>
          </div>
        </div>
      `;

      sendEmail(
        email,
        'We received your message - Mental Swasthya Support',
        userHtml,
        supportEmail
      ).catch((err) => console.error('[Support Email] Error sending user confirmation:', err));

      res.status(201).json(
        new ApiResponse(
          201,
          { ticketId: supportEntry._id },
          'Thank you! Your message has been received. Our support team will get back to you shortly.'
        )
      );
    }
  );
}

export default SupportController;
