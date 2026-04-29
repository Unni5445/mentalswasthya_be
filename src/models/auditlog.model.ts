import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditLog extends Document {
  actor: mongoose.Types.ObjectId | null;
  org: mongoose.Types.ObjectId | null;
  action:
    | 'login'
    | 'logout'
    | 'login_failed'
    | 'account_locked'
    | 'password_change'
    | 'user_created'
    | 'user_updated'
    | 'user_deleted'
    | 'role_changed'
    | 'subscription_created'
    | 'subscription_updated'
    | 'subscription_canceled'
    | 'payment_succeeded'
    | 'payment_failed'
    | 'report_generated'
    | 'settings_updated';
  targetModel: string | null;
  targetId: mongoose.Types.ObjectId | null;
  meta: any;
  ipAddress: string | null;
  userAgent: string | null;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    actor: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    org: { type: Schema.Types.ObjectId, ref: 'Org', default: null },

    action: {
      type: String,
      enum: [
        'login',
        'logout',
        'login_failed',
        'account_locked',
        'password_change',
        'user_created',
        'user_updated',
        'user_deleted',
        'role_changed',
        'subscription_created',
        'subscription_updated',
        'subscription_canceled',
        'payment_succeeded',
        'payment_failed',
        'report_generated',
        'settings_updated',
      ],
      required: true,
    },

    targetModel: { type: String, default: null },
    targetId: { type: Schema.Types.ObjectId, default: null },

    meta: { type: Schema.Types.Mixed, default: {} },

    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },
  },
  {
    timestamps: true,
    strict: true,
  }
);

auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });
auditLogSchema.index({ actor: 1, createdAt: -1 });
auditLogSchema.index({ org: 1, action: 1, createdAt: -1 });
auditLogSchema.index({ targetModel: 1, targetId: 1 });

const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
export default AuditLog;
