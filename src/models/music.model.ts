import mongoose, { Document, Schema } from 'mongoose';

export interface IMusic extends Document {
  user: mongoose.Types.ObjectId;
  title: string;
  artist?: string;
  audioUrl: string;
  thumbnailUrl?: string;
  duration?: number;
  category?: string;
  shape?: 'box' | 'triangle' | 'circle';
  isPublic: boolean;
}

const musicSchema = new Schema<IMusic>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    artist: { type: String },
    audioUrl: { type: String, required: true },
    thumbnailUrl: { type: String },
    duration: { type: Number },
    category: { type: String },
    shape: { 
      type: String, 
      enum: ['box', 'triangle', 'circle', null],
      default: null
    },
    isPublic: { type: Boolean, default: false },
  },
  { timestamps: true }
);

musicSchema.index({ user: 1, createdAt: -1 });
musicSchema.index({ category: 1 });
musicSchema.index({ shape: 1 });

const Music = mongoose.model<IMusic>('Music', musicSchema);
export default Music;
