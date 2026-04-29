import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcrypt';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  role: 'individual' | 'employee' | 'org_admin' | 'super_admin';
  org: mongoose.Types.ObjectId | null;
  appStartOption: 'first_login_of_day' | 'every_login' | 'manual';
  isActive: boolean;
  isEmailVerified: boolean;
  failedLoginAttempts: number;
  lockUntil: Date | null;
  lastLoginAt: Date | null;
  passwordChangedAt: Date | null;
  refreshToken: string | null;
  comparePassword(candidate: string): Promise<boolean>;
  isLocked(): boolean;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },

    role: {
      type: String,
      enum: ['individual', 'employee', 'org_admin', 'super_admin'],
      default: 'individual',
    },

    org: { type: Schema.Types.ObjectId, ref: 'Org', default: null },

    appStartOption: {
      type: String,
      enum: ['first_login_of_day', 'every_login', 'manual'],
      default: 'first_login_of_day',
    },

    isActive: { type: Boolean, default: true },
    isEmailVerified: { type: Boolean, default: false },

    failedLoginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date, default: null },

    lastLoginAt: { type: Date, default: null },
    passwordChangedAt: { type: Date, default: null },
    refreshToken: { type: String, select: false, default: null },
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

const User = mongoose.model<IUser>('User', userSchema);
export default User;
