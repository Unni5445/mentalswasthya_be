import mongoose, { Document, Schema } from 'mongoose';

export interface IAffirmation extends Document {
  title: string;
  artist?: string;
  language: string;
  audioUrl: string;
  thumbnailUrl?: string;
  duration?: number;
  category?: string;
  isActive: boolean;
}

const affirmationSchema = new Schema<IAffirmation>(
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

affirmationSchema.index({ createdAt: -1 });
affirmationSchema.index({ category: 1 });
affirmationSchema.index({ language: 1 });

const Affirmation = mongoose.model<IAffirmation>('Affirmation', affirmationSchema);
export default Affirmation;
