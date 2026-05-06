import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true, maxlength: 40 },
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  avatar:   { type: String, default: '' },
  bio:      { type: String, default: '', maxlength: 200 },
  role:     { type: String, enum: ['user', 'admin'], default: 'user' },
  suspended:{ type: Boolean, default: false },
  strikes:  { type: Number, default: 0 },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.compare = function (plain) {
  return bcrypt.compare(plain, this.password);
};

userSchema.methods.toPublic = function () {
  return { id: this._id, name: this.name, email: this.email, avatar: this.avatar, bio: this.bio, role: this.role };
};

export default mongoose.model('User', userSchema);
