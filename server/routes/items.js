import { Router } from 'express';
import axios from 'axios';

const router = Router();
let cache = null, cacheTime = 0;
const TTL = 60 * 60 * 1000; // 1 hour

function stripHtml(html) { return (html ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(); }
function fmtProp(value, prefix, postfix) {
  const num = parseFloat(value);
  const sign = prefix?.includes('sign') && num > 0 ? '+' : '';
  return `${sign}${value}${postfix ?? ''}`;
}

router.get('/', async (req, res, next) => {
  try {
    if (cache && Date.now() - cacheTime < TTL) return res.json(cache);
    const { data } = await axios.get('https://assets.deadlock-api.com/v2/items');
    const items = data
      .filter(i => i.shopable && i.name && i.cost > 0)
      .map(i => {
        const props = i.properties ?? {};
        const sections = (i.tooltip_sections ?? []).map(s => {
          const attr = s.section_attributes?.[0] ?? {};
          const keys = [
            ...(attr.important_properties ?? []),
            ...(attr.properties ?? []),
          ];
          const stats = keys.map(k => {
            const p = props[k];
            if (!p || p.value == null || p.value === p.disable_value || !p.label) return null;
            return { label: p.label, value: fmtProp(String(p.value), p.prefix ?? '', p.postfix ?? '') };
          }).filter(Boolean);
          return { type: s.section_type, desc: stripHtml(attr.loc_string), stats };
        });
        return {
          id: i.id || i.name,
          name: i.name,
          cost: i.cost || 0,
          tier: i.item_tier || 1,
          slot: i.item_slot_type,
          images: { icon: i.shop_image_webp || i.shop_image || i.image_webp || i.image },
          activation: i.activation ?? null,
          description: stripHtml(i.description?.desc),
          tooltipSections: sections,
        };
      })
      .sort((a, b) => a.cost - b.cost);
    cache = items; cacheTime = Date.now();
    res.json(items);
  } catch (e) { next(e); }
});

export default router;
