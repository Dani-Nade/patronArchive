import mongoose from 'mongoose';

const heroSchema = new mongoose.Schema({
  apiId:       { type: Number, unique: true, sparse: true },
  name:        { type: String, required: true, unique: true, trim: true },
  role:        { type: String, default: '' },
  images:      { portrait: String },
  description: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('Hero', heroSchema);
