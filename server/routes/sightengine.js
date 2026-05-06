import { Router } from 'express';
import { checkText } from '../utils/sightengine.js';

const router = Router();

router.post('/check', async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ success: false, error: 'No text provided' });
    const result = await checkText(text);
    res.json({ success: true, ...result });
  } catch (e) { next(e); }
});

export default router;
