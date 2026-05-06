import mongoose from 'mongoose';

const buildSchema = new mongoose.Schema({
  author:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title:     { type: String, required: true, trim: true, maxlength: 120 },
  hero: {
    id:     Number,
    name:   String,
    images: { portrait: String },
  },
  items: [{
    id:     String,
    name:   String,
    cost:   Number,
    slot:   String,
    tier:   Number,
    images: { icon: String },
  }],
  totalCost: { type: Number, default: 0 },
  guide: {
    early: { type: String, default: '' },
    mid:   { type: String, default: '' },
    late:  { type: String, default: '' },
  },
  video: {
    id:        String,
    title:     String,
    channel:   String,
    thumbnail: String,
    timestamps: [{
      time:    String,
      seconds: Number,
      label:   String,
      color:   String,
    }],
  },
  role:      { type: String, enum: ['carry', 'support', 'bruiser', 'tank', 'assassin'], default: 'carry' },
  patch:     { type: String, default: '1.0' },
  upvotes:   { type: [mongoose.Schema.Types.ObjectId], default: [] },
  downvotes: { type: [mongoose.Schema.Types.ObjectId], default: [] },
  reported:     { type: Boolean, default: false },
  reportReason: { type: String, default: '' },
  autoFlagged:  { type: Boolean, default: false },
  flaggedWords: { type: [String], default: [] },
}, { timestamps: true });

buildSchema.index({ title: 'text', 'hero.name': 'text' });

export default mongoose.model('Build', buildSchema);
