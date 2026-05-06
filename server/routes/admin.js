import { Router } from 'express';
import User from '../models/User.js';
import Build from '../models/Build.js';
import Comment from '../models/Comment.js';
import auth, { requireAdmin } from '../middleware/auth.js';
import { getStats } from '../utils/apiTracker.js';
import { patchState, refreshPatch } from '../utils/patchStore.js';

const STRIKE_LIMIT = 3;

async function strikeUser(userId) {
  if (!userId) return;
  const user = await User.findById(userId);
  if (!user || user.role === 'admin') return;
  user.strikes = (user.strikes ?? 0) + 1;
  if (user.strikes >= STRIKE_LIMIT) user.suspended = true;
  await user.save();
  return user;
}

const router = Router();
router.use(auth, requireAdmin);

/* GET /api/admin/stats */
router.get('/stats', async (req, res, next) => {
  try {
    const [totalUsers, totalBuilds, totalComments, reportedBuilds, reportedComments] = await Promise.all([
      User.countDocuments(),
      Build.countDocuments(),
      Comment.countDocuments(),
      Build.countDocuments({ reported: true }),
      Comment.countDocuments({ reported: true }),
    ]);

    const last7Days = await Promise.all(
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const start = new Date(d.setHours(0, 0, 0, 0));
        const end   = new Date(d.setHours(23, 59, 59, 999));
        return Build.countDocuments({ createdAt: { $gte: start, $lte: end } });
      })
    );

    res.json({ success: true, stats: { totalUsers, totalBuilds, totalComments, reportedBuilds, reportedComments, last7Days } });
  } catch (e) { next(e); }
});

/* GET /api/admin/users?page=1&limit=20&search= */
router.get('/users', async (req, res, next) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const q = search ? { $or: [{ name: new RegExp(search, 'i') }, { email: new RegExp(search, 'i') }] } : {};
    const [users, total] = await Promise.all([
      User.find(q).select('-password').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(+limit).lean(),
      User.countDocuments(q),
    ]);
    res.json({ success: true, users, total });
  } catch (e) { next(e); }
});

/* PUT /api/admin/users/:id/role  — toggle user ↔ admin */
router.put('/users/:id/role', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: 'Not found' });
    if (user._id.toString() === req.user._id.toString())
      return res.status(400).json({ success: false, error: 'Cannot change your own role' });
    user.role = user.role === 'admin' ? 'user' : 'admin';
    await user.save();
    res.json({ success: true, role: user.role });
  } catch (e) { next(e); }
});

/* PUT /api/admin/users/:id/suspend */
router.put('/users/:id/suspend', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: 'Not found' });
    if (user._id.toString() === req.user._id.toString())
      return res.status(400).json({ success: false, error: 'Cannot suspend yourself' });
    user.suspended = !user.suspended;
    await user.save();
    res.json({ success: true, suspended: user.suspended });
  } catch (e) { next(e); }
});

/* DELETE /api/admin/users/:id */
router.delete('/users/:id', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, error: 'Not found' });
    if (user._id.toString() === req.user._id.toString())
      return res.status(400).json({ success: false, error: 'Cannot delete yourself' });
    await Promise.all([
      user.deleteOne(),
      Build.deleteMany({ author: user._id }),
      Comment.deleteMany({ author: user._id }),
    ]);
    res.json({ success: true });
  } catch (e) { next(e); }
});

/* GET /api/admin/reports */
router.get('/reports', async (req, res, next) => {
  try {
    const [builds, comments] = await Promise.all([
      Build.find({ reported: true }).populate('author', 'name email strikes suspended').sort({ updatedAt: -1 }).lean(),
      Comment.find({ reported: true }).populate('author', 'name email strikes suspended').populate('build', 'title').sort({ updatedAt: -1 }).lean(),
    ]);
    res.json({ success: true, builds, comments });
  } catch (e) { next(e); }
});

/* DELETE /api/admin/reports/builds/:id */
router.delete('/reports/builds/:id', async (req, res, next) => {
  try {
    const build = await Build.findById(req.params.id);
    if (!build) return res.status(404).json({ success: false, error: 'Not found' });
    const updated = await strikeUser(build.author);
    await build.deleteOne();
    res.json({ success: true, strikes: updated?.strikes, suspended: updated?.suspended });
  } catch (e) { next(e); }
});

/* POST /api/admin/reports/builds/:id/dismiss */
router.post('/reports/builds/:id/dismiss', async (req, res, next) => {
  try {
    await Build.findByIdAndUpdate(req.params.id, { reported: false });
    res.json({ success: true });
  } catch (e) { next(e); }
});

/* DELETE /api/admin/reports/comments/:id */
router.delete('/reports/comments/:id', async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ success: false, error: 'Not found' });
    const updated = await strikeUser(comment.author);
    await comment.deleteOne();
    res.json({ success: true, strikes: updated?.strikes, suspended: updated?.suspended });
  } catch (e) { next(e); }
});

/* POST /api/admin/reports/comments/:id/dismiss */
router.post('/reports/comments/:id/dismiss', async (req, res, next) => {
  try {
    await Comment.findByIdAndUpdate(req.params.id, { reported: false });
    res.json({ success: true });
  } catch (e) { next(e); }
});

/* GET /api/admin/health */
router.get('/health', (req, res) => {
  res.json({ success: true, ...getStats() });
});

/* GET /api/admin/patch */
router.get('/patch', (_req, res) => {
  res.json({ success: true, ...patchState });
});

/* PUT /api/admin/patch — manual override */
router.put('/patch', async (req, res, next) => {
  try {
    const { version, forceRefresh } = req.body;
    if (forceRefresh) {
      await refreshPatch();
      return res.json({ success: true, ...patchState, refreshed: true });
    }
    if (!version || !/^\d+\.\d+(\.\d+)?$/.test(version))
      return res.status(400).json({ success: false, error: 'Invalid patch format (e.g. 1.5 or 1.5.1)' });
    patchState.version = version;
    patchState.source = 'manual';
    patchState.updatedAt = new Date().toISOString();
    res.json({ success: true, ...patchState });
  } catch (e) { next(e); }
});

export default router;
