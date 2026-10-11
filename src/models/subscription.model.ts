import mongoose, { Document, Schema } from 'mongoose';
import { softDeletePlugin, ISoftDelete } from '../utils/softDelete.plugin';

export interface ISubscription extends Document, ISoftDelete {
  org?: mongoose.Types.ObjectId;
  user?: mongoose.Types.ObjectId;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  plan?: mongoose.Types.ObjectId;
  tier: 'free' | 'pro' | 'executive';
  planName: string;
  billingCycle: 'monthly' | 'annual';
  price: number;
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete';
  autoDebit: boolean;
  autoDebitStoppedAt?: Date | null;
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
    org: { type: Schema.Types.ObjectId, ref: 'Org', default: null },
    user: { type: Schema.Types.ObjectId, ref: 'User', default: null },

    stripeCustomerId: { type: String, default: null },
    stripeSubscriptionId: { type: String, default: null },
    stripePriceId: { type: String, default: null },

    plan: { type: Schema.Types.ObjectId, ref: 'Plan', default: null },
    tier: { type: String, enum: ['free', 'pro', 'executive'], default: 'pro' },
    planName: { type: String, default: 'Wellness Pro' },
    billingCycle: { type: String, enum: ['monthly', 'annual'], default: 'annual' },
    price: { type: Number, default: 7.99 },
    autoDebit: { type: Boolean, default: true },
    autoDebitStoppedAt: { type: Date, default: null },

    status: {
      type: String,
      enum: ['active', 'trialing', 'past_due', 'canceled', 'unpaid', 'incomplete'],
      default: 'active',
    },

    seats: { type: Number, default: 1, min: 1 },
    seatsUsed: { type: Number, default: 0 },

    currentPeriodStart: { type: Date, default: Date.now },
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
subscriptionSchema.index({ user: 1 });
subscriptionSchema.index({ stripeSubscriptionId: 1 });

subscriptionSchema.plugin(softDeletePlugin);

const Subscription = mongoose.model<ISubscription>('Subscription', subscriptionSchema);
export default Subscription;
