import mongoose, { Document, Schema } from 'mongoose';

export interface ISubscription extends Document {
  org: mongoose.Types.ObjectId;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  stripePriceId: string;
  plan: 'per_user_monthly' | 'per_user_yearly';
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete';
  seats: number;
  seatsUsed: number;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEnd: Date | null;
  canceledAt: Date | null;
  isValid: boolean;
}

const subscriptionSchema = new Schema<ISubscription>(
  {
    org: { type: Schema.Types.ObjectId, ref: 'Org', required: true },

    stripeCustomerId: { type: String, required: true },
    stripeSubscriptionId: { type: String, required: true },
    stripePriceId: { type: String, required: true },

    plan: {
      type: String,
      enum: ['per_user_monthly', 'per_user_yearly'],
      required: true,
    },

    status: {
      type: String,
      enum: ['active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete'],
      default: 'trialing',
    },

    seats: { type: Number, required: true, min: 1 },
    seatsUsed: { type: Number, default: 0 },

    currentPeriodStart: { type: Date, required: true },
    currentPeriodEnd: { type: Date, required: true },

    trialEnd: { type: Date, default: null },
    canceledAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

subscriptionSchema.virtual('isValid').get(function (this: ISubscription) {
  return ['active', 'trialing'].includes(this.status) &&
    this.currentPeriodEnd > new Date();
});

subscriptionSchema.index({ org: 1 });
subscriptionSchema.index({ stripeSubscriptionId: 1 });

const Subscription = mongoose.model<ISubscription>('Subscription', subscriptionSchema);
export default Subscription;
