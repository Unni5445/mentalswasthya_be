import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { User, Org, AuditLog, Subscription } from '../models';
import sendEmail from '../utils/sendEmail';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

const signAccessToken = (userId: any, role: string, issuer: string) =>
  jwt.sign(
    { id: userId, role, iss: issuer },
    (issuer === 'individual'
      ? process.env.JWT_SECRET_INDIVIDUAL
      : process.env.JWT_SECRET_CORPORATE) as string,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );

const signRefreshToken = (userId: any, issuer: string) =>
  jwt.sign(
    { id: userId, iss: issuer },
    (issuer === 'individual'
      ? process.env.JWT_REFRESH_SECRET_INDIVIDUAL
      : process.env.JWT_REFRESH_SECRET_CORPORATE) as string,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );

const sanitize = (user: any) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  org: user.org,
  appStartOption: user.appStartOption,
});

const bcryptDummy = () =>
  bcrypt.compare('dummy', '$2b$12$invalidhashfortimingreasons00000000000000000000000');

export const individualRegister = async ({ name, email, password }: any) => {
  const existing = await User.findOne({ email });
  if (existing) throw { status: 409, message: 'Email already registered' };

  const user = await User.create({
    name,
    email,
    password,
    role: 'individual',
    org: null,
  });

  await AuditLog.create({ actor: user._id, action: 'user_created', targetModel: 'User', targetId: user._id });

  const accessToken = signAccessToken(user._id, user.role, 'individual');
  const refreshToken = signRefreshToken(user._id, 'individual');

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken, user: sanitize(user) };
};

export const corporateSignUp = async ({ name, email, password, orgName, seats = 10 }: any) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) throw { status: 409, message: 'Email already registered' };

  // 1. Create Organization
  const org = await Org.create({
    name: orgName,
    adminEmail: email,
    totalSeats: seats,
  });

  // 2. Create Initial Subscription (Mock for now)
  const now = new Date();
  const nextMonth = new Date();
  nextMonth.setMonth(now.getMonth() + 1);

  const sub = await Subscription.create({
    org: org._id,
    stripeCustomerId: 'mock_customer_id',
    stripeSubscriptionId: 'mock_sub_id',
    stripePriceId: 'mock_price_id',
    plan: 'per_user_monthly',
    status: 'trialing',
    seats: seats,
    seatsUsed: 1, // The admin
    currentPeriodStart: now,
    currentPeriodEnd: nextMonth,
  });

  org.subscription = sub._id as any;
  await org.save();

  // 3. Create Admin User
  const user = await User.create({
    name,
    email,
    password,
    role: 'org_admin',
    org: org._id,
  });

  await AuditLog.create({
    actor: user._id,
    org: org._id,
    action: 'org_created',
    targetModel: 'Org',
    targetId: org._id,
  });

  const accessToken = signAccessToken(user._id, user.role, 'corporate');
  const refreshToken = signRefreshToken(user._id, 'corporate');

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken, user: sanitize(user) };
};

export const corporateRegister = async ({ name, email, password, orgId, role = 'employee' }: any) => {
  const org = await Org.findById(orgId).populate('subscription');
  if (!org || !org.isActive) throw { status: 404, message: 'Organisation not found or inactive' };

  const sub = org.subscription as any;
  if (!sub || sub.seatsUsed >= sub.seats) {
    throw { status: 403, message: 'Organization seat limit reached. Please upgrade your subscription.' };
  }

  const existing = await User.findOne({ email });
  if (existing) throw { status: 409, message: 'Email already registered' };

  const user = await User.create({ name, email, password, role, org: org._id });

  // Increment seats used
  await Subscription.findOneAndUpdate({ org: org._id }, { $inc: { seatsUsed: 1 } });

  await AuditLog.create({
    actor: user._id,
    org: org._id,
    action: 'user_created',
    targetModel: 'User',
    targetId: user._id,
  });

  const accessToken = signAccessToken(user._id, user.role, 'corporate');
  const refreshToken = signRefreshToken(user._id, 'corporate');

  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken, user: sanitize(user) };
};

export const login = async ({ email, password, issuer }: any, ipAddress: string | undefined, userAgent: string | undefined) => {
  const user = await User.findOne({ email }).select('+password +refreshToken').populate('org');

  if (!user) {
    await bcryptDummy();
    throw { status: 401, message: 'Invalid email or password' };
  }

  if (user.isLocked()) {
    throw { status: 423, message: `Account locked. Try again after ${user.lockUntil?.toISOString()}` };
  }

  const match = await user.comparePassword(password);

  if (!match) {
    user.failedLoginAttempts += 1;
    if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
      user.lockUntil = new Date(Date.now() + LOCK_DURATION_MS);
      await AuditLog.create({
        actor: user._id,
        org: user.org?._id,
        action: 'account_locked',
        targetModel: 'User',
        targetId: user._id,
        meta: { ipAddress },
      });
    }
    await user.save({ validateBeforeSave: false });

    await AuditLog.create({
      actor: user._id,
      org: user.org?._id,
      action: 'login_failed',
      meta: { ipAddress, userAgent },
    });

    throw { status: 401, message: 'Invalid email or password' };
  }

  if (issuer === 'corporate' && !user.org) {
    throw { status: 403, message: 'No corporate organisation linked to this account' };
  }

  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  user.lastLoginAt = new Date();

  const accessToken = signAccessToken(user._id, user.role, issuer);
  const refreshToken = signRefreshToken(user._id, issuer);
  user.refreshToken = refreshToken;

  await user.save({ validateBeforeSave: false });

  await AuditLog.create({
    actor: user._id,
    org: user.org?._id,
    action: 'login',
    meta: { ipAddress, userAgent, issuer },
  });

  return { accessToken, refreshToken, user: sanitize(user) };
};

export const refresh = async (incomingRefreshToken: string, issuer: string) => {
  if (!incomingRefreshToken) throw { status: 401, message: 'Refresh token required' };

  const secret = (issuer === 'individual'
    ? process.env.JWT_REFRESH_SECRET_INDIVIDUAL
    : process.env.JWT_REFRESH_SECRET_CORPORATE) as string;

  let decoded: any;
  try {
    decoded = jwt.verify(incomingRefreshToken, secret);
  } catch {
    throw { status: 401, message: 'Invalid or expired refresh token' };
  }

  const user = await User.findById(decoded.id).select('+refreshToken');
  if (!user || user.refreshToken !== incomingRefreshToken) {
    throw { status: 401, message: 'Refresh token reuse detected' };
  }

  const accessToken = signAccessToken(user._id, user.role, issuer);
  const newRefreshToken = signRefreshToken(user._id, issuer);
  user.refreshToken = newRefreshToken;
  await user.save({ validateBeforeSave: false });

  return { accessToken, refreshToken: newRefreshToken };
};

export const logout = async (userId: any, orgId: any, ipAddress: string | undefined) => {
  await User.findByIdAndUpdate(userId, { refreshToken: null });
  await AuditLog.create({
    actor: userId,
    org: orgId || null,
    action: 'logout',
    meta: { ipAddress },
  });
};

export const forgotPassword = async (email: string) => {
  if (!email) throw { status: 400, message: 'Email is required' };

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  // Return generic message to prevent email enumeration
  if (!user) {
    return { message: 'If this email is registered, you will receive a password reset link.' };
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await user.save({ validateBeforeSave: false });

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; background: #ffffff; border-radius: 16px; border: 1px solid #e5e7eb;">
      <h2 style="color: #0a331c; font-size: 24px; margin-top: 0;">Password Reset Request</h2>
      <p style="color: #374151; font-size: 15px; line-height: 1.6;">Hello ${user.name || 'there'},</p>
      <p style="color: #374151; font-size: 15px; line-height: 1.6;">We received a request to reset your Mental Swasthya account password. Click the button below to choose a new password:</p>
      <div style="margin: 32px 0;">
        <a href="${resetUrl}" style="background-color: #0a331c; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 14px; display: inline-block;">Reset Password</a>
      </div>
      <p style="color: #6b7280; font-size: 13px; line-height: 1.5;">If the button doesn't work, copy and paste this link into your browser:</p>
      <p style="color: #0a331c; font-size: 13px; word-break: break-all;"><a href="${resetUrl}" style="color: #0a331c;">${resetUrl}</a></p>
      <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 24px 0;" />
      <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">This reset link is valid for 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
    </div>
  `;

  await sendEmail(user.email, 'Mental Swasthya - Password Reset', html);

  console.log(`[MentalSwasthya Auth] Password reset requested for ${user.email}. Reset URL: ${resetUrl}`);

  return { message: 'If this email is registered, you will receive a password reset link.' };
};

export const resetPassword = async (token: string, newPassword: string) => {
  if (!token) throw { status: 400, message: 'Reset token is required' };
  if (!newPassword || newPassword.length < 8) {
    throw { status: 400, message: 'Password must be at least 8 characters long' };
  }

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: new Date() },
  }).select('+password +resetPasswordToken +resetPasswordExpires');

  if (!user) {
    throw { status: 400, message: 'Password reset link is invalid or has expired' };
  }

  user.password = newPassword;
  user.resetPasswordToken = null;
  user.resetPasswordExpires = null;
  user.refreshToken = null;
  await user.save();

  await AuditLog.create({
    actor: user._id,
    org: user.org || null,
    action: 'password_reset',
    targetModel: 'User',
    targetId: user._id,
  });

  return { message: 'Password has been reset successfully. Please log in with your new password.' };
};
