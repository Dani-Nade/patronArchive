import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  build:    { type: mongoose.Schema.Types.ObjectId, ref: 'Build', required: true },
  author:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  body:     { type: String, required: true, maxlength: 1000 },
  reported:     { type: Boolean, default: false },
  reportReason: { type: String, default: '' },
  autoFlagged:  { type: Boolean, default: false },
  flaggedWords: { type: [String], default: [] },
}, { timestamps: true });

export default mongoose.model('Comment', commentSchema);
