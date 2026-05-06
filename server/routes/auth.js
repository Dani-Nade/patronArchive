import { Router } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Build from '../models/Build.js';
import auth from '../middleware/auth.js';

const router = Router();

function sign(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ success: false, error: 'Name, email and password required' });
    if (password.length < 6)
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    if (await User.findOne({ email: email.toLowerCase() }))
      return res.status(400).json({ success: false, error: 'Email already in use' });

    const user = await User.create({ name, email, password });
    res.json({ success: true, token: sign(user._id), user: user.toPublic() });
  } catch (e) { next(e); }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: (email ?? '').toLowerCase() });
    if (!user || !(await user.compare(password)))
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    if (user.suspended)
      return res.status(403).json({ success: false, error: 'Account suspended' });
    res.json({ success: true, token: sign(user._id), user: user.toPublic() });
  } catch (e) { next(e); }
});

router.get('/me', auth, async (req, res) => {
  res.json({ success: true, user: req.user.toPublic() });
});

router.put('/me', auth, async (req, res, next) => {
  try {
    const { name, bio, avatar } = req.body;
    if (name)  req.user.name = name;
    if (bio !== undefined) req.user.bio = bio;
    if (avatar !== undefined) req.user.avatar = avatar;
    await req.user.save();
    res.json({ success: true, user: req.user.toPublic() });
  } catch (e) { next(e); }
});

router.delete('/me', auth, async (req, res, next) => {
  try {
    await req.user.deleteOne();
    res.json({ success: true });
  } catch (e) { next(e); }
});

/* GET /api/auth/users/:id — public user profile */
router.get('/users/:id', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    const buildCount = await Build.countDocuments({ author: user._id });
    res.json({ success: true, user: user.toPublic(), buildCount });
  } catch (e) { next(e); }
});

export default router;
