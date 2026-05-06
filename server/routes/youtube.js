import { Router } from 'express';
import axios from 'axios';
import { track, trackError } from '../utils/apiTracker.js';

const router = Router();
const BASE  = 'https://www.googleapis.com/youtube/v3';

function pick(item) {
  return {
    id:        item.id?.videoId ?? item.id,
    title:     item.snippet.title,
    channel:   item.snippet.channelTitle,
    thumbnail: item.snippet.thumbnails?.high?.url ?? item.snippet.thumbnails?.default?.url ?? '',
  };
}

router.get('/', async (req, res, next) => {
  const KEY = process.env.YOUTUBE_API_KEY;
  if (!KEY) return res.status(500).json({ success: false, error: 'YouTube API key not configured' });

  const { videoId, q } = req.query;
  try {
    if (videoId) {
      track('youtube');
      const { data } = await axios.get(`${BASE}/videos`, {
        params: { id: videoId, key: KEY, part: 'snippet' },
      });
      const item = data.items?.[0];
      if (!item) return res.status(404).json({ success: false, error: 'Video not found' });
      return res.json(pick(item));
    }
    if (q) {
      track('youtube');
      const { data } = await axios.get(`${BASE}/search`, {
        params: { q, key: KEY, part: 'snippet', type: 'video', maxResults: 6 },
      });
      return res.json((data.items ?? []).map(pick));
    }
    res.status(400).json({ success: false, error: 'Provide videoId or q' });
  } catch (e) { trackError('youtube'); next(e); }
});

export default router;
