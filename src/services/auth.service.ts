import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { User, Org, AuditLog, Subscription } from '../models';
import sendEmail from '../utils/sendEmail';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

const signAccessToken = (userId: any, role: string, issuer: string, deviceId?: string | null) =>
  jwt.sign(
    { id: userId, role, iss: issuer, deviceId: deviceId || null },
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
  mobile: user.mobile || null,
  designation: user.designation || null,
  photoUrl: user.photoUrl || user.avatar || null,
  avatar: user.photoUrl || user.avatar || null,
  appStartOption: user.appStartOption,
  weeklyOff: user.weeklyOff && user.weeklyOff.length ? user.weeklyOff : ['SUN'],
  hasCompletedTour: user.hasCompletedTour ?? false,
});

const bcryptDummy = () =>
  bcrypt.compare('dummy', '$2b$12$invalidhashfortimingreasons00000000000000000000000');

const EMAIL_VERIFICATION_EXPIRY_MINUTES = Math.min(
  Math.max(parseInt(process.env.EMAIL_VERIFICATION_EXPIRY_MINUTES || '15', 10) || 15, 1),
  15
);
const EMAIL_VERIFICATION_EXPIRY_MS = EMAIL_VERIFICATION_EXPIRY_MINUTES * 60 * 1000; // 10 to 15 minutes max (capped at 15m)

export const individualRegister = async ({ name, email, password, referralCode, giftCode }: any) => {
  const existing = await User.findOne({ email });
  if (existing) throw { status: 409, message: 'Email already registered' };

  const verificationToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = new Date(Date.now() + EMAIL_VERIFICATION_EXPIRY_MS); // 15 minutes max
  const appliedGiftCode = (giftCode || referralCode || '').trim() || null;
  const userName = (name && typeof name === 'string' && name.trim()) ? name.trim() : email.split('@')[0];

  const user = await User.create({
    name: userName,
    email,
    password,
    role: 'individual',
    org: null,
    giftCode: appliedGiftCode,
    isEmailVerified: false,
    emailVerificationToken: hashedToken,
    emailVerificationOtp: otp,
    emailVerificationExpires: expires,
  });

  await AuditLog.create({ actor: user._id, action: 'user_created', targetModel: 'User', targetId: user._id });

  const frontendUrl = process.env.FRONTEND_URL || 'https://mentalswasthya.com';
  const verifyUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; background: #ffffff; border-radius: 16px; border: 1px solid #e5e7eb;">
      <h2 style="color: #0a331c; font-size: 24px; margin-top: 0;">Welcome to Mental Swasthya</h2>
      <p style="color: #374151; font-size: 15px; line-height: 1.6;">Hello ${user.name || 'there'},</p>
      <p style="color: #374151; font-size: 15px; line-height: 1.6;">Thank you for creating an account with Mental Swasthya. To complete your registration and activate your account, please enter the 6-digit verification code below or click the verification link:</p>
      
      <div style="margin: 28px 0; padding: 20px; background: #f4f8f3; border-radius: 12px; text-align: center; border: 1px solid #dbe8da;">
        <span style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.12em; color: #4a6b47; font-weight: 700; display: block; margin-bottom: 8px;">Your Verification Code</span>
        <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #0a331c; font-family: monospace;">${otp}</span>
      </div>

      <div style="margin: 24px 0; text-align: center;">
        <a href="${verifyUrl}" style="background-color: #0a331c; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 14px; display: inline-block;">Verify Email Address</a>
      </div>

      <p style="color: #6b7280; font-size: 13px; line-height: 1.5;">Or copy and paste this link into your browser:</p>
      <p style="color: #0a331c; font-size: 13px; word-break: break-all;"><a href="${verifyUrl}" style="color: #0a331c;">${verifyUrl}</a></p>
      <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 24px 0;" />
      <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">This code and link will expire in ${EMAIL_VERIFICATION_EXPIRY_MINUTES} minutes. If you did not sign up for Mental Swasthya, please ignore this email.</p>
    </div>
  `;

  await sendEmail(user.email, 'Mental Swasthya - Verify Your Email', html);
  console.log(`[MentalSwasthya Auth] Email Verification sent to ${user.email}. URL: ${verifyUrl} | OTP: ${otp}`);

  return {
    requiresEmailVerification: true,
    email: user.email,
    message: 'Registration successful. A verification code and link has been sent to your email.',
  };
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

export const login = async (
  { email, password, issuer, deviceId, deviceName }: any,
  ipAddress: string | undefined,
  userAgent: string | undefined
) => {
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

  if (issuer === 'individual' && user.isEmailVerified === false) {
    throw {
      status: 403,
      requiresEmailVerification: true,
      email: user.email,
      message: 'Please verify your email before logging in. A verification code and link were sent to your inbox.',
    };
  }

  // ── Two-Factor Authentication (2FA) & One-Device Policy Enforcement ──
  const incomingDeviceId = deviceId || null;
  const incomingDeviceName = deviceName || (userAgent ? userAgent.slice(0, 50) : 'Web Device');

  if (incomingDeviceId && user.currentDeviceId && user.currentDeviceId !== incomingDeviceId) {
    const twoFactorOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    user.twoFactorOtp = twoFactorOtp;
    user.twoFactorOtpExpires = expires;
    user.twoFactorPendingDeviceId = incomingDeviceId;
    user.twoFactorPendingDeviceName = incomingDeviceName;
    await user.save({ validateBeforeSave: false });

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; background: #ffffff; border-radius: 16px; border: 1px solid #e5e7eb;">
        <h2 style="color: #0a331c; font-size: 24px; margin-top: 0;">New Device Sign-in Verification (2FA)</h2>
        <p style="color: #374151; font-size: 15px; line-height: 1.6;">Hello ${user.name || 'there'},</p>
        <p style="color: #374151; font-size: 15px; line-height: 1.6;">We detected a sign-in attempt to your Mental Swasthya account from a new device: <strong>${incomingDeviceName}</strong>.</p>
        <p style="color: #374151; font-size: 15px; line-height: 1.6;">To uphold our <strong>One-Device Policy</strong> and prevent unauthorized account sharing, please enter the 6-digit verification code below. Authorizing this device will automatically log out any other active device.</p>
        
        <div style="margin: 28px 0; padding: 20px; background: #f4f8f3; border-radius: 12px; text-align: center; border: 1px solid #dbe8da;">
          <span style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.12em; color: #4a6b47; font-weight: 700; display: block; margin-bottom: 8px;">2FA Device Verification Code</span>
          <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #0a331c; font-family: monospace;">${twoFactorOtp}</span>
        </div>

        <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">This code is valid for 15 minutes. If you did not attempt this sign-in, please change your password immediately.</p>
      </div>
    `;

    await sendEmail(user.email, 'Mental Swasthya - New Device 2FA Code', html);
    console.log(`[MentalSwasthya 2FA] Sent code to ${user.email}: ${twoFactorOtp} for device ${incomingDeviceId}`);

    return {
      requires2FA: true,
      email: user.email,
      currentDevice: user.currentDeviceName || 'Previous Device',
      newDevice: incomingDeviceName,
      message: 'New device detected. A 6-digit 2FA verification code has been sent to your email to authorize this device.',
    };
  }

  // Same device or first device registered:
  if (incomingDeviceId) {
    user.currentDeviceId = incomingDeviceId;
    user.currentDeviceName = incomingDeviceName;
  }

  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  user.lastLoginAt = new Date();

  const accessToken = signAccessToken(user._id, user.role, issuer, user.currentDeviceId);
  const refreshToken = signRefreshToken(user._id, issuer);
  user.refreshToken = refreshToken;

  await user.save({ validateBeforeSave: false });

  await AuditLog.create({
    actor: user._id,
    org: user.org?._id,
    action: 'login',
    meta: { ipAddress, userAgent, issuer, deviceId: user.currentDeviceId },
  });

  return { accessToken, refreshToken, user: sanitize(user) };
};

export const verify2FA = async ({ email, otp, deviceId, deviceName, issuer = 'individual' }: any) => {
  if (!email || !otp) {
    throw { status: 400, message: 'Email and verification code are required' };
  }

  const user = await User.findOne({
    email: email.toLowerCase().trim(),
    twoFactorOtp: otp.trim(),
    twoFactorOtpExpires: { $gt: new Date() },
  })
    .select('+refreshToken +twoFactorOtp +twoFactorOtpExpires +twoFactorPendingDeviceId +twoFactorPendingDeviceName')
    .populate('org');

  if (!user) {
    throw { status: 400, message: 'Invalid or expired 2FA verification code' };
  }

  const effectiveDeviceId = deviceId || user.twoFactorPendingDeviceId || crypto.randomUUID();
  const effectiveDeviceName = deviceName || user.twoFactorPendingDeviceName || 'Authorized Device';

  user.twoFactorOtp = null;
  user.twoFactorOtpExpires = null;
  user.twoFactorPendingDeviceId = null;
  user.twoFactorPendingDeviceName = null;
  user.currentDeviceId = effectiveDeviceId;
  user.currentDeviceName = effectiveDeviceName;
  user.lastLoginAt = new Date();

  const accessToken = signAccessToken(user._id, user.role, issuer, effectiveDeviceId);
  const refreshToken = signRefreshToken(user._id, issuer);
  user.refreshToken = refreshToken;

  await user.save({ validateBeforeSave: false });

  await AuditLog.create({
    actor: user._id,
    org: user.org?._id,
    action: 'device_switch_authorized',
    meta: { deviceId: effectiveDeviceId, deviceName: effectiveDeviceName },
  });

  return {
    accessToken,
    refreshToken,
    user: sanitize(user),
    message: 'New device authorized successfully! Previous device has been logged out.',
  };
};

export const resend2FA = async ({ email, deviceId, deviceName }: any) => {
  if (!email) throw { status: 400, message: 'Email is required' };

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
    '+twoFactorOtp +twoFactorOtpExpires +twoFactorPendingDeviceId +twoFactorPendingDeviceName'
  );
  if (!user) {
    return { message: 'If this email is registered, a new verification code has been sent.' };
  }

  const twoFactorOtp = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = new Date(Date.now() + 15 * 60 * 1000);

  user.twoFactorOtp = twoFactorOtp;
  user.twoFactorOtpExpires = expires;
  if (deviceId) user.twoFactorPendingDeviceId = deviceId;
  if (deviceName) user.twoFactorPendingDeviceName = deviceName;
  await user.save({ validateBeforeSave: false });

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; background: #ffffff; border-radius: 16px; border: 1px solid #e5e7eb;">
      <h2 style="color: #0a331c; font-size: 24px; margin-top: 0;">New Device Sign-in Verification (2FA)</h2>
      <p style="color: #374151; font-size: 15px; line-height: 1.6;">Hello ${user.name || 'there'},</p>
      <p style="color: #374151; font-size: 15px; line-height: 1.6;">Here is your new 6-digit verification code to authorize sign-in on: <strong>${deviceName || 'New Device'}</strong>.</p>
      
      <div style="margin: 28px 0; padding: 20px; background: #f4f8f3; border-radius: 12px; text-align: center; border: 1px solid #dbe8da;">
        <span style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.12em; color: #4a6b47; font-weight: 700; display: block; margin-bottom: 8px;">2FA Device Verification Code</span>
        <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #0a331c; font-family: monospace;">${twoFactorOtp}</span>
      </div>

      <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">This code is valid for 15 minutes. If you did not attempt this sign-in, please change your password immediately.</p>
    </div>
  `;

  await sendEmail(user.email, 'Mental Swasthya - New Device 2FA Code', html);
  return { message: 'A fresh 2FA code has been sent to your email.' };
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

  const accessToken = signAccessToken(user._id, user.role, issuer, user.currentDeviceId);
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
  // Return generic message to prevent email enumeration, but include email for client state
  if (!user) {
    return {
      message: 'If this email is registered, you will receive a password reset code and link.',
      email: email.toLowerCase().trim(),
    };
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  user.resetPasswordToken = hashedToken;
  user.resetPasswordOtp = otp;
  user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await user.save({ validateBeforeSave: false });

  const frontendUrl = process.env.FRONTEND_URL || 'https://mentalswasthya.com';
  const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; background: #ffffff; border-radius: 16px; border: 1px solid #e5e7eb;">
      <h2 style="color: #0a331c; font-size: 24px; margin-top: 0;">Password Reset Request</h2>
      <p style="color: #374151; font-size: 15px; line-height: 1.6;">Hello ${user.name || 'there'},</p>
      <p style="color: #374151; font-size: 15px; line-height: 1.6;">We received a request to reset your Mental Swasthya account password.</p>
      
      <div style="margin: 28px 0; padding: 20px; background: #f4f8f3; border-radius: 12px; text-align: center; border: 1px solid #dbe8da;">
        <span style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.12em; color: #4a6b47; font-weight: 700; display: block; margin-bottom: 8px;">Your 6-Digit Reset Code</span>
        <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #0a331c; font-family: monospace;">${otp}</span>
      </div>

      <p style="color: #374151; font-size: 15px; line-height: 1.6;">Enter this 6-digit code in the app, or click the button below to reset your password online:</p>
      <div style="margin: 24px 0; text-align: center;">
        <a href="${resetUrl}" style="background-color: #0a331c; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 14px; display: inline-block;">Reset Password Online</a>
      </div>
      <p style="color: #6b7280; font-size: 13px; line-height: 1.5;">If the button doesn't work, copy and paste this link into your browser:</p>
      <p style="color: #0a331c; font-size: 13px; word-break: break-all;"><a href="${resetUrl}" style="color: #0a331c;">${resetUrl}</a></p>
      <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 24px 0;" />
      <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">This reset code and link are valid for 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
    </div>
  `;

  await sendEmail(user.email, 'Mental Swasthya - Password Reset Code', html);

  console.log(`[MentalSwasthya Auth] Password reset requested for ${user.email}. Reset URL: ${resetUrl} | OTP: ${otp}`);

  return {
    message: 'If this email is registered, you will receive a password reset code and link.',
    email: user.email,
  };
};

export const resetPassword = async (
  arg1: string | { token?: string; email?: string; otp?: string; password?: string; newPassword?: string },
  arg2?: string
) => {
  let token: string | undefined;
  let email: string | undefined;
  let otp: string | undefined;
  let newPassword: string | undefined;

  if (typeof arg1 === 'string') {
    token = arg1;
    newPassword = arg2;
  } else if (arg1 && typeof arg1 === 'object') {
    token = arg1.token;
    email = arg1.email;
    otp = arg1.otp;
    newPassword = arg1.newPassword || arg1.password || arg2;
  }

  if (!newPassword || newPassword.length < 8) {
    throw { status: 400, message: 'Password must be at least 8 characters long' };
  }

  let user: any;

  if (token && token.trim()) {
    const hashedToken = crypto.createHash('sha256').update(token.trim()).digest('hex');
    user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    }).select('+password +resetPasswordToken +resetPasswordOtp +resetPasswordExpires');
  } else if (email && otp) {
    user = await User.findOne({
      email: email.toLowerCase().trim(),
      resetPasswordOtp: otp.trim(),
      resetPasswordExpires: { $gt: new Date() },
    }).select('+password +resetPasswordToken +resetPasswordOtp +resetPasswordExpires');
  } else {
    throw { status: 400, message: 'Reset token or email with 6-digit code is required.' };
  }

  if (!user) {
    throw { status: 400, message: 'Password reset code or link is invalid or has expired.' };
  }

  user.password = newPassword;
  user.resetPasswordToken = null;
  user.resetPasswordOtp = null;
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

export const verifyEmail = async ({ token, email, otp }: { token?: string; email?: string; otp?: string }) => {
  let user: any;

  if (token) {
    const hashedToken = crypto.createHash('sha256').update(token.trim()).digest('hex');
    user = await User.findOne({
      emailVerificationToken: hashedToken,
    }).select('+emailVerificationToken +emailVerificationExpires +refreshToken');

    if (!user) {
      throw { status: 400, message: 'Invalid verification link.' };
    }

    if (!user.emailVerificationExpires || user.emailVerificationExpires <= new Date()) {
      throw {
        status: 400,
        message: `Verification link has expired (valid for ${EMAIL_VERIFICATION_EXPIRY_MINUTES} minutes max). Please request a new verification link.`,
      };
    }
  } else if (email && otp) {
    user = await User.findOne({
      email: email.toLowerCase().trim(),
      emailVerificationOtp: otp.trim(),
    }).select('+emailVerificationOtp +emailVerificationExpires +refreshToken');

    if (!user) {
      throw { status: 400, message: 'Invalid verification code or email address.' };
    }

    if (!user.emailVerificationExpires || user.emailVerificationExpires <= new Date()) {
      throw {
        status: 400,
        message: `Verification code has expired (valid for ${EMAIL_VERIFICATION_EXPIRY_MINUTES} minutes max). Please click 'Resend Code' to receive a new one.`,
      };
    }
  } else {
    throw { status: 400, message: 'Verification token or email with code is required.' };
  }

  user.isEmailVerified = true;
  user.emailVerificationToken = null;
  user.emailVerificationExpires = null;
  user.emailVerificationOtp = null;

  const accessToken = signAccessToken(user._id, user.role, 'individual');
  const refreshToken = signRefreshToken(user._id, 'individual');
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  await AuditLog.create({
    actor: user._id,
    action: 'email_verified',
    targetModel: 'User',
    targetId: user._id,
  });

  return { accessToken, refreshToken, user: sanitize(user), message: 'Email verified successfully!' };
};

export const resendVerification = async (email: string) => {
  if (!email) throw { status: 400, message: 'Email is required' };

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
    '+emailVerificationToken +emailVerificationExpires +emailVerificationOtp'
  );

  if (!user) {
    return { message: 'If this email is registered, a new verification code has been sent.' };
  }

  if (user.isEmailVerified) {
    return { message: 'This email is already verified. Please sign in.' };
  }

  const verificationToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const expires = new Date(Date.now() + EMAIL_VERIFICATION_EXPIRY_MS); // 10 to 15 minutes max

  user.emailVerificationToken = hashedToken;
  user.emailVerificationOtp = otp;
  user.emailVerificationExpires = expires;
  await user.save({ validateBeforeSave: false });

  const frontendUrl = process.env.FRONTEND_URL || 'https://mentalswasthya.com';
  const verifyUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; background: #ffffff; border-radius: 16px; border: 1px solid #e5e7eb;">
      <h2 style="color: #0a331c; font-size: 24px; margin-top: 0;">Verify Your Email Address</h2>
      <p style="color: #374151; font-size: 15px; line-height: 1.6;">Hello ${user.name || 'there'},</p>
      <p style="color: #374151; font-size: 15px; line-height: 1.6;">Here is your new 6-digit verification code to activate your Mental Swasthya account:</p>
      
      <div style="margin: 28px 0; padding: 20px; background: #f4f8f3; border-radius: 12px; text-align: center; border: 1px solid #dbe8da;">
        <span style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.12em; color: #4a6b47; font-weight: 700; display: block; margin-bottom: 8px;">Your Verification Code</span>
        <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #0a331c; font-family: monospace;">${otp}</span>
      </div>

      <div style="margin: 24px 0; text-align: center;">
        <a href="${verifyUrl}" style="background-color: #0a331c; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 14px; display: inline-block;">Verify Email Address</a>
      </div>

      <p style="color: #6b7280; font-size: 13px; line-height: 1.5;">Or copy and paste this link into your browser:</p>
      <p style="color: #0a331c; font-size: 13px; word-break: break-all;"><a href="${verifyUrl}" style="color: #0a331c;">${verifyUrl}</a></p>
      <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 24px 0;" />
      <p style="color: #9ca3af; font-size: 12px; margin-bottom: 0;">This code and link will expire in ${EMAIL_VERIFICATION_EXPIRY_MINUTES} minutes. If you did not request this, please ignore this email.</p>
    </div>
  `;

  await sendEmail(user.email, 'Mental Swasthya - Verify Your Email', html);
  console.log(`[MentalSwasthya Auth] Resent Email Verification to ${user.email}. URL: ${verifyUrl} | OTP: ${otp}`);

  return { message: 'A new verification code and link has been sent to your email.' };
};
