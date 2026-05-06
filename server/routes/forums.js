import { Router } from 'express';
import Thread from '../models/Thread.js';
import Reply  from '../models/Reply.js';
import auth   from '../middleware/auth.js';

const router = Router();

/* GET /api/forums/threads?search=&category=&sort=hot|new|top|discussed&page=&limit= */
router.get('/threads', async (req, res, next) => {
  try {
    const { search, category, sort = 'hot', page = 1, limit = 20 } = req.query;
    const q = {};
    if (search)   q.$or = [{ title: new RegExp(search, 'i') }, { body: new RegExp(search, 'i') }];
    if (category) q.category = category;

    const [threads, total] = await Promise.all([
      Thread.find(q)
        .populate('author', 'name avatar')
        .sort({ pinned: -1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(+limit)
        .lean(),
      Thread.countDocuments(q),
    ]);

    const ids = threads.map(t => t._id);
    const agg = await Reply.aggregate([
      { $match: { thread: { $in: ids } } },
      { $group: { _id: '$thread', count: { $sum: 1 } } },
    ]);
    const rcMap = Object.fromEntries(agg.map(r => [r._id.toString(), r.count]));
    let list = threads.map(t => ({ ...t, replyCount: rcMap[t._id.toString()] ?? 0 }));

    if (sort === 'hot')       list = list.sort((a, b) => (b.upvotes.length + b.replyCount * 2) - (a.upvotes.length + a.replyCount * 2));
    else if (sort === 'top')  list = list.sort((a, b) => b.upvotes.length - a.upvotes.length);
    else if (sort === 'discussed') list = list.sort((a, b) => b.replyCount - a.replyCount);

    res.json({ success: true, threads: list, total });
  } catch (e) { next(e); }
});

/* POST /api/forums/threads */
router.post('/threads', auth, async (req, res, next) => {
  try {
    const { title, body, category } = req.body;
    if (!title?.trim() || !body?.trim())
      return res.status(400).json({ success: false, error: 'Title and body are required' });
    const thread = await Thread.create({ title: title.trim(), body: body.trim(), category, author: req.user._id });
    await thread.populate('author', 'name avatar');
    res.status(201).json({ success: true, thread });
  } catch (e) { next(e); }
});

/* GET /api/forums/threads/:id */
router.get('/threads/:id', async (req, res, next) => {
  try {
    const thread = await Thread.findById(req.params.id).populate('author', 'name avatar').lean();
    if (!thread) return res.status(404).json({ success: false, error: 'Not found' });
    const replyCount = await Reply.countDocuments({ thread: thread._id });
    res.json({ success: true, thread: { ...thread, replyCount } });
  } catch (e) { next(e); }
});

/* DELETE /api/forums/threads/:id */
router.delete('/threads/:id', auth, async (req, res, next) => {
  try {
    const thread = await Thread.findById(req.params.id);
    if (!thread) return res.status(404).json({ success: false, error: 'Not found' });
    if (thread.author.toString() !== req.user._id.toString() && req.user.role !== 'admin')
      return res.status(403).json({ success: false, error: 'Forbidden' });
    await Promise.all([thread.deleteOne(), Reply.deleteMany({ thread: thread._id })]);
    res.json({ success: true });
  } catch (e) { next(e); }
});

/* POST /api/forums/threads/:id/upvote */
router.post('/threads/:id/upvote', auth, async (req, res, next) => {
  try {
    const thread = await Thread.findById(req.params.id);
    if (!thread) return res.status(404).json({ success: false, error: 'Not found' });
    const idx = thread.upvotes.findIndex(id => id.toString() === req.user._id.toString());
    if (idx >= 0) thread.upvotes.splice(idx, 1);
    else thread.upvotes.push(req.user._id);
    await thread.save();
    res.json({ success: true, upvotes: thread.upvotes.length, upvoted: idx < 0 });
  } catch (e) { next(e); }
});

/* GET /api/forums/threads/:id/replies */
router.get('/threads/:id/replies', async (req, res, next) => {
  try {
    const replies = await Reply.find({ thread: req.params.id })
      .populate('author', 'name avatar')
      .sort({ createdAt: 1 })
      .lean();
    res.json({ success: true, replies });
  } catch (e) { next(e); }
});

/* POST /api/forums/threads/:id/replies */
router.post('/threads/:id/replies', auth, async (req, res, next) => {
  try {
    const { body, parentReply } = req.body;
    if (!body?.trim()) return res.status(400).json({ success: false, error: 'Body required' });
    const thread = await Thread.findById(req.params.id);
    if (!thread) return res.status(404).json({ success: false, error: 'Thread not found' });
    if (thread.locked && req.user.role !== 'admin')
      return res.status(403).json({ success: false, error: 'Thread is locked' });
    const reply = await Reply.create({
      thread: req.params.id,
      author: req.user._id,
      body: body.trim(),
      parentReply: parentReply || null,
    });
    await reply.populate('author', 'name avatar');
    res.status(201).json({ success: true, reply });
  } catch (e) { next(e); }
});

/* DELETE /api/forums/replies/:id */
router.delete('/replies/:id', auth, async (req, res, next) => {
  try {
    const reply = await Reply.findById(req.params.id);
    if (!reply) return res.status(404).json({ success: false, error: 'Not found' });
    if (reply.author.toString() !== req.user._id.toString() && req.user.role !== 'admin')
      return res.status(403).json({ success: false, error: 'Forbidden' });
    await reply.deleteOne();
    res.json({ success: true });
  } catch (e) { next(e); }
});

export default router;
