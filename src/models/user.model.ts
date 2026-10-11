import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcrypt';
import { softDeletePlugin, ISoftDelete } from '../utils/softDelete.plugin';

export interface IUser extends Document, ISoftDelete {
  name: string;
  email: string;
  password?: string;
  role: 'individual' | 'employee' | 'org_admin' | 'super_admin';
  org: mongoose.Types.ObjectId | null;
  giftCode?: string | null;
  appStartOption: 'first_login_of_day' | 'every_login' | 'manual';
  weeklyOff: string[];
  isActive: boolean;
  isEmailVerified: boolean;
  failedLoginAttempts: number;
  lockUntil: Date | null;
  lastLoginAt: Date | null;
  passwordChangedAt: Date | null;
  refreshToken: string | null;
  resetPasswordToken?: string | null;
  resetPasswordOtp?: string | null;
  resetPasswordExpires?: Date | null;
  emailVerificationToken?: string | null;
  emailVerificationExpires?: Date | null;
  emailVerificationOtp?: string | null;
  currentDeviceId?: string | null;
  currentDeviceName?: string | null;
  twoFactorOtp?: string | null;
  twoFactorOtpExpires?: Date | null;
  twoFactorPendingDeviceId?: string | null;
  twoFactorPendingDeviceName?: string | null;
  favoriteAffirmations: mongoose.Types.ObjectId[];
  favoriteMeditations: mongoose.Types.ObjectId[];
  comparePassword(candidate: string): Promise<boolean>;
  isLocked(): boolean;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: false, trim: true, default: '' },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },

    role: {
      type: String,
      enum: ['individual', 'employee', 'org_admin', 'super_admin'],
      default: 'individual',
    },

    org: { type: Schema.Types.ObjectId, ref: 'Org', default: null },
    giftCode: { type: String, trim: true, default: null },

    appStartOption: {
      type: String,
      enum: ['first_login_of_day', 'every_login', 'manual'],
      default: 'first_login_of_day',
    },

    weeklyOff: {
      type: [String],
      enum: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
      default: ['SUN'],
    },

    isActive: { type: Boolean, default: true },
    isEmailVerified: { type: Boolean, default: false },

    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },

    lastLoginAt: { type: Date, default: null },
    passwordChangedAt: { type: Date, default: null },
    refreshToken: { type: String, select: false, default: null },
    resetPasswordToken: { type: String, select: false, default: null },
    resetPasswordOtp: { type: String, select: false, default: null },
    resetPasswordExpires: { type: Date, select: false, default: null },
    emailVerificationToken: { type: String, select: false, default: null },
    emailVerificationExpires: { type: Date, select: false, default: null },
    emailVerificationOtp: { type: String, select: false, default: null },

    currentDeviceId: { type: String, default: null },
    currentDeviceName: { type: String, default: null },
    twoFactorOtp: { type: String, select: false, default: null },
    twoFactorOtpExpires: { type: Date, select: false, default: null },
    twoFactorPendingDeviceId: { type: String, select: false, default: null },
    twoFactorPendingDeviceName: { type: String, select: false, default: null },

    favoriteAffirmations: [{ type: Schema.Types.ObjectId, ref: 'Affirmation' }],
    favoriteMeditations: [{ type: Schema.Types.ObjectId, ref: 'Meditation' }],
  },
  { timestamps: true }
);

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  if (this.password) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  this.passwordChangedAt = new Date();
  next();
});

// Compare password
userSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

// Check if account is locked
userSchema.methods.isLocked = function (): boolean {
  return !!(this.lockUntil && this.lockUntil > new Date());
};

userSchema.index({ org: 1 });

userSchema.plugin(softDeletePlugin);

const User = mongoose.model<IUser>('User', userSchema);
export default User;
