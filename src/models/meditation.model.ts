import mongoose, { Document, Schema } from 'mongoose';

export interface IMeditation extends Document {
  title: string;
  artist?: string;
  language: string;
  audioUrl: string;
  thumbnailUrl?: string;
  duration?: number;
  category?: string;
  isActive: boolean;
}

const meditationSchema = new Schema<IMeditation>(
  {
    title: { type: String, required: true },
    artist: { type: String },
    language: { type: String, required: true },
    audioUrl: { type: String, required: true },
    thumbnailUrl: { type: String },
    duration: { type: Number },
    category: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

meditationSchema.index({ createdAt: -1 });
meditationSchema.index({ category: 1 });
meditationSchema.index({ language: 1 });

const Meditation = mongoose.model<IMeditation>('Meditation', meditationSchema);
export default Meditation;
