import { Router } from 'express';
import Comment from '../models/Comment.js';
import auth from '../middleware/auth.js';
import { checkText } from '../utils/sightengine.js';

const router = Router();

/* GET /api/comments?build=:id */
router.get('/', async (req, res, next) => {
  try {
    const { build } = req.query;
    if (!build) return res.status(400).json({ success: false, error: 'build param required' });
    const comments = await Comment.find({ build })
      .populate('author', 'name avatar')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, comments });
  } catch (e) { next(e); }
});

/* POST /api/comments */
router.post('/', auth, async (req, res, next) => {
  try {
    const { build, body, bypass } = req.body;
    if (!build || !body?.trim())
      return res.status(400).json({ success: false, error: 'build and body required' });

    if (!bypass) {
      const check = await checkText(body);
      const flagged = check.matches.map(m => m.match ?? m);
      if (flagged.length > 0) {
        return res.status(422).json({ success: false, flagged: true, words: flagged,
          error: 'Comment contains flagged language. Review and re-submit or post anyway.' });
      }
    }

    const autoFlagged = !!bypass;
    const comment = await Comment.create({
      build, author: req.user._id, body: body.trim(),
      autoFlagged, reported: autoFlagged,
      reportReason: autoFlagged ? 'Auto-flagged: user bypassed content warning' : '',
    });
    await comment.populate('author', 'name avatar');
    res.json({ success: true, comment });
  } catch (e) { next(e); }
});

/* DELETE /api/comments/:id */
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ success: false, error: 'Not found' });
    if (comment.author.toString() !== req.user._id.toString() && req.user.role !== 'admin')
      return res.status(403).json({ success: false, error: 'Forbidden' });
    await comment.deleteOne();
    res.json({ success: true });
  } catch (e) { next(e); }
});

/* POST /api/comments/:id/report */
router.post('/:id/report', auth, async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ success: false, error: 'Not found' });
    if (comment.author.toString() === req.user._id.toString())
      return res.status(400).json({ success: false, error: 'Cannot report your own comment' });
    comment.reported = true;
    comment.reportReason = (req.body.reason ?? '').slice(0, 500);
    await comment.save();
    res.json({ success: true });
  } catch (e) { next(e); }
});

export default router;
