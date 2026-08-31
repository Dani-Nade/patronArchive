import { Router } from 'express';
import Build from '../models/Build.js';
import auth from '../middleware/auth.js';
import { checkText } from '../utils/sightengine.js';
import { reindexBuild } from '../utils/rag.js';
import Chunk from '../models/Chunk.js';

const router = Router();

/* GET /api/builds  ?search=&hero=&role=&sort=&patch=&author= */
router.get('/', async (req, res, next) => {
  try {
    const { search, hero, role, sort, author, patch } = req.query;
    const q = {};
    if (search) {
      const re = new RegExp(search, 'i');
      q.$or = [{ title: re }, { 'hero.name': re }];
    }
    if (hero)   q['hero.name'] = new RegExp(`^${hero}$`, 'i');
    if (role)   q.role = role;
    if (patch)  q.patch = patch;
    if (author) q.author = author;

    let cursor = Build.find(q).populate('author', 'name avatar');
    if (sort === 'top')   cursor = cursor.sort({ upvotes: -1, createdAt: -1 });
    else                  cursor = cursor.sort({ createdAt: -1 });

    const builds = await cursor.lean();
    res.json({ success: true, builds });
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const build = await Build.findById(req.params.id).populate('author', 'name avatar bio');
    if (!build) return res.status(404).json({ success: false, error: 'Build not found' });
    res.json({ success: true, build });
  } catch (e) { next(e); }
});

router.post('/', auth, async (req, res, next) => {
  try {
    const { title, guide, hero, items, totalCost, video, role, patch, bypass } = req.body;

    if (!bypass) {
      const checks = await Promise.all([
        checkText(title),
        checkText(guide?.early),
        checkText(guide?.mid),
        checkText(guide?.late),
      ]);
      const flagged = checks.flatMap(c => c.matches.map(m => m.match ?? m));
      if (flagged.length > 0) {
        return res.status(422).json({ success: false, flagged: true, words: flagged,
          error: 'Content contains flagged language. Review and re-submit or post anyway.' });
      }
    }

    const autoFlagged = !!bypass;
    const build = await Build.create({
      author: req.user._id,
      title:  title || `${hero?.name ?? 'Custom'} Build`,
      hero, items, totalCost, guide, video, role, patch,
      autoFlagged,
      reported: autoFlagged,
      reportReason: autoFlagged ? 'Auto-flagged: user bypassed content warning' : '',
    });
    reindexBuild(build._id).catch(e => console.warn('[rag] index update failed:', e.message));
    res.json({ success: true, build });
  } catch (e) { next(e); }
});

router.put('/:id', auth, async (req, res, next) => {
  try {
    const build = await Build.findById(req.params.id);
    if (!build) return res.status(404).json({ success: false, error: 'Not found' });
    if (build.author.toString() !== req.user._id.toString() && req.user.role !== 'admin')
      return res.status(403).json({ success: false, error: 'Forbidden' });
    Object.assign(build, req.body);
    await build.save();
    reindexBuild(build._id).catch(e => console.warn('[rag] index update failed:', e.message));
    res.json({ success: true, build });
  } catch (e) { next(e); }
});

router.delete('/:id', auth, async (req, res, next) => {
  try {
    const build = await Build.findById(req.params.id);
    if (!build) return res.status(404).json({ success: false, error: 'Not found' });
    if (build.author.toString() !== req.user._id.toString() && req.user.role !== 'admin')
      return res.status(403).json({ success: false, error: 'Forbidden' });
    await build.deleteOne();
    Chunk.deleteMany({ refId: String(build._id), source: { $in: ['build', 'guide'] } })
      .catch(e => console.warn('[rag] index cleanup failed:', e.message));
    res.json({ success: true });
  } catch (e) { next(e); }
});

router.post('/:id/vote', auth, async (req, res, next) => {
  try {
    const { vote } = req.body;
    const build = await Build.findById(req.params.id);
    if (!build) return res.status(404).json({ success: false, error: 'Not found' });
    const uid = req.user._id.toString();
    build.upvotes   = build.upvotes.filter(id => id.toString() !== uid);
    build.downvotes = build.downvotes.filter(id => id.toString() !== uid);
    if (vote === 'up')   build.upvotes.push(req.user._id);
    if (vote === 'down') build.downvotes.push(req.user._id);
    await build.save();
    res.json({ success: true, upvotes: build.upvotes.length, downvotes: build.downvotes.length });
  } catch (e) { next(e); }
});

/* POST /api/builds/:id/report */
router.post('/:id/report', auth, async (req, res, next) => {
  try {
    const build = await Build.findById(req.params.id);
    if (!build) return res.status(404).json({ success: false, error: 'Not found' });
    if (build.author.toString() === req.user._id.toString())
      return res.status(400).json({ success: false, error: 'Cannot report your own build' });
    build.reported = true;
    build.reportReason = (req.body.reason ?? '').slice(0, 500);
    await build.save();
    res.json({ success: true });
  } catch (e) { next(e); }
});

export default router;
