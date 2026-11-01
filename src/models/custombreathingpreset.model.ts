import mongoose, { Document, Schema } from 'mongoose';
import { softDeletePlugin, ISoftDelete } from '../utils/softDelete.plugin';

export interface ICustomBreathingPreset extends Document, ISoftDelete {
  user: mongoose.Types.ObjectId;
  shape: 'triangle' | 'box' | 'circle';
  name: string;
  timingLabel: string;
  inhale: number;
  hold1: number;
  exhale: number;
  hold2: number;
  createdAt: Date;
  updatedAt: Date;
}

const customBreathingPresetSchema = new Schema<ICustomBreathingPreset>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    shape: {
      type: String,
      enum: ['triangle', 'box', 'circle'],
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    timingLabel: {
      type: String,
      required: true,
      trim: true,
    },
    inhale: {
      type: Number,
      required: true,
      min: 1,
      max: 60,
    },
    hold1: {
      type: Number,
      default: 0,
      min: 0,
      max: 60,
    },
    exhale: {
      type: Number,
      required: true,
      min: 1,
      max: 60,
    },
    hold2: {
      type: Number,
      default: 0,
      min: 0,
      max: 60,
    },
  },
  { timestamps: true }
);

customBreathingPresetSchema.index({ user: 1, shape: 1, createdAt: 1 });
customBreathingPresetSchema.plugin(softDeletePlugin);

const CustomBreathingPreset = mongoose.model<ICustomBreathingPreset>(
  'CustomBreathingPreset',
  customBreathingPresetSchema
);

export default CustomBreathingPreset;
