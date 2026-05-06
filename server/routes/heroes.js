import { Router } from 'express';
import axios from 'axios';

const router = Router();
let cache = null, cacheTime = 0;
const TTL = 60 * 60 * 1000;

router.get('/', async (req, res, next) => {
  try {
    if (cache && Date.now() - cacheTime < TTL) return res.json(cache);
    const { data } = await axios.get('https://assets.deadlock-api.com/v2/heroes');
    const heroes = data
      .map(h => ({
        id: h.id,
        name: h.name,
        images: { portrait: h.images?.icon_hero_card_webp || h.images?.icon_hero_card || h.images?.icon_image_small },
      }))
      .filter(h => h.images.portrait && h.name !== 'Hero Dummy');
    cache = heroes; cacheTime = Date.now();
    res.json(heroes);
  } catch (e) { next(e); }
});

export default router;
