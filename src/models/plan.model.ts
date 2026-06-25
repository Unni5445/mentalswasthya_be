import mongoose, { Document, Schema } from 'mongoose';
import { softDeletePlugin, ISoftDelete } from '../utils/softDelete.plugin';

export interface IPlan extends Document, ISoftDelete {
  name: string;
  type: 'individual' | 'corporate';
  price: number;
  interval: 'monthly' | 'yearly' | 'lifetime';
  features: string[];
  isActive: boolean;
  stripePriceId?: string;
}

const planSchema = new Schema<IPlan>(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['individual', 'corporate'],
      required: true,
    },
    price: { type: Number, required: true, min: 0 },
    interval: {
      type: String,
      enum: ['monthly', 'yearly', 'lifetime'],
      required: true,
    },
    features: [{ type: String }],
    isActive: { type: Boolean, default: true },
    stripePriceId: { type: String, default: null },
  },
  { timestamps: true }
);

planSchema.plugin(softDeletePlugin);

const Plan = mongoose.model<IPlan>('Plan', planSchema);
export default Plan;
