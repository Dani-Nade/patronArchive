import mongoose from 'mongoose';

const replySchema = new mongoose.Schema({
  thread:      { type: mongoose.Schema.Types.ObjectId, ref: 'Thread', required: true },
  author:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  body:        { type: String, required: true, maxlength: 2000 },
  parentReply: { type: mongoose.Schema.Types.ObjectId, ref: 'Reply', default: null },
  reported:    { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model('Reply', replySchema);
