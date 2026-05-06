import mongoose from 'mongoose';

const threadSchema = new mongoose.Schema({
  title:    { type: String, required: true, maxlength: 200, trim: true },
  body:     { type: String, required: true, maxlength: 5000 },
  author:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  category: { type: String, enum: ['general', 'strategy', 'meta', 'help', 'offtopic'], default: 'general' },
  upvotes:  [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  pinned:   { type: Boolean, default: false },
  locked:   { type: Boolean, default: false },
  reported: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model('Thread', threadSchema);
