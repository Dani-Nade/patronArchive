import axios from 'axios';
import Chunk from '../models/Chunk.js';
import Build from '../models/Build.js';
import Thread from '../models/Thread.js';
import Reply from '../models/Reply.js';
// Imported for its side effect: populate('author') needs the User schema
// registered on the mongoose instance, and the ingest CLI never loads it otherwise.
import '../models/User.js';
import { embed, embedOne, cosine } from './embeddings.js';

const ASSETS = 'https://assets.deadlock-api.com/v2';

/* How strongly community score floats a passage above its raw similarity.
 * Small on purpose: it reorders near-ties so well-rated builds win, but it
 * never lets a popular-but-irrelevant build outrank a genuinely relevant one. */
const WEIGHT_BOOST = 0.08;

/* Per-source caps, so a query that looks item-shaped still gets some guide
 * prose back and vice versa. Remaining slots are filled from the global ranking. */
const SOURCE_CAPS = { item: 5, hero: 2, build: 3, guide: 4, thread: 3, reply: 3 };

const money = n => Number(n ?? 0).toLocaleString('en-US');
const clean = s => (s ?? '').toString().replace(/\s+/g, ' ').trim();

/* ─────────────────────────── corpus construction ─────────────────────────── */

async function itemChunks() {
  const { data } = await axios.get(`${ASSETS}/items`, { timeout: 20000 });
  return data
    .filter(i => i.shopable && i.name && i.cost > 0)
    .map(i => {
      const stats = (i.tooltip_sections ?? []).flatMap(s => {
        const attr = s.section_attributes?.[0] ?? {};
        const keys = [...(attr.important_properties ?? []), ...(attr.properties ?? [])];
        return keys
          .map(k => i.properties?.[k])
          .filter(p => p?.label && p.value != null && p.value !== p.disable_value)
          .map(p => `${p.label} ${p.value}${p.postfix ?? ''}`);
      });
      const slot = i.item_slot_type ? `${i.item_slot_type} slot` : 'item';
      const desc = clean((i.description?.desc ?? '').replace(/<[^>]+>/g, ' '));
      const text = [
        `${i.name} — tier ${i.item_tier ?? 1} ${slot}, costs ${money(i.cost)} souls.`,
        desc,
        stats.length ? `Grants: ${stats.join('; ')}.` : '',
        i.activation && i.activation !== 'passive' ? `This is an active item (${i.activation}).` : 'This is a passive item.',
      ].filter(Boolean).join(' ');

      return {
        source: 'item',
        refId: String(i.id ?? i.name),
        title: i.name,
        text,
        url: '/builds/create',
        weight: 0,
      };
    });
}

async function heroChunks() {
  const { data } = await axios.get(`${ASSETS}/heroes`, { timeout: 20000 });
  const heroes = data.filter(h => h.name && h.name !== 'Hero Dummy');

  // Fold in what the community has actually published for each hero, which is
  // far more useful than the bare roster entry the assets API returns.
  const builds = await Build.find().select('title hero role totalCost upvotes downvotes').lean();
  const byHero = new Map();
  for (const b of builds) {
    const key = (b.hero?.name ?? '').toLowerCase();
    if (!key) continue;
    if (!byHero.has(key)) byHero.set(key, []);
    byHero.get(key).push(b);
  }

  return heroes.map(h => {
    const mine = byHero.get(h.name.toLowerCase()) ?? [];
    const summary = mine.length
      ? `Published builds for ${h.name}: ${mine
          .map(b => `"${b.title}" (${b.role}, ${money(b.totalCost)} souls)`)
          .join('; ')}.`
      : `No community builds have been published for ${h.name} yet.`;
    return {
      source: 'hero',
      refId: String(h.id),
      title: h.name,
      text: `${h.name} is a playable hero in Deadlock. ${summary}`,
      url: `/heroes/${encodeURIComponent(h.name)}`,
      weight: 0,
    };
  });
}

async function buildChunks() {
  const builds = await Build.find().populate('author', 'name').lean();
  if (!builds.length) return [];

  const scores = builds.map(b => (b.upvotes?.length ?? 0) - (b.downvotes?.length ?? 0));
  const top = Math.max(1, ...scores);
  const bottom = Math.min(0, ...scores);
  const norm = s => (top === bottom ? 0 : (s - bottom) / (top - bottom));

  const out = [];
  builds.forEach((b, idx) => {
    const score = scores[idx];
    const weight = norm(score);
    const url = `/builds/${b._id}`;
    const author = b.author?.name ?? 'a community member';
    const items = (b.items ?? []).map(i => `${i.name} (${money(i.cost)})`).join(', ') || 'no items listed';
    const votes = `Community score ${score >= 0 ? '+' : ''}${score} from ${b.upvotes?.length ?? 0} upvotes and ${b.downvotes?.length ?? 0} downvotes.`;

    out.push({
      source: 'build',
      refId: String(b._id),
      title: b.title,
      url,
      weight,
      text: [
        `"${b.title}" is a ${b.role} build for ${b.hero?.name ?? 'an unspecified hero'}, published by ${author} for patch ${b.patch ?? '1.0'}.`,
        `Item order: ${items}.`,
        `Total cost ${money(b.totalCost)} souls across ${b.items?.length ?? 0} items.`,
        votes,
      ].join(' '),
    });

    for (const [phase, label] of [['early', 'early game'], ['mid', 'mid game'], ['late', 'late game']]) {
      const body = clean(b.guide?.[phase]);
      if (body.length < 20) continue;
      out.push({
        source: 'guide',
        refId: String(b._id),
        title: `${b.title} — ${label}`,
        url,
        weight,
        text: `From the ${label} section of "${b.title}", a ${b.role} ${b.hero?.name ?? ''} build by ${author}: ${body}`,
      });
    }
  });
  return out;
}

async function forumChunks() {
  const threads = await Thread.find().populate('author', 'name').lean();
  if (!threads.length) return [];

  const upvotes = threads.map(t => t.upvotes?.length ?? 0);
  const top = Math.max(1, ...upvotes);

  const out = threads.map(t => ({
    source: 'thread',
    refId: String(t._id),
    title: t.title,
    url: `/forums/${t._id}`,
    weight: (t.upvotes?.length ?? 0) / top,
    text: `Forum thread in the ${t.category} category, "${t.title}", started by ${t.author?.name ?? 'a member'}: ${clean(t.body)}`,
  }));

  const replies = await Reply.find().populate('author', 'name').lean();
  const titleOf = Object.fromEntries(threads.map(t => [String(t._id), t]));
  for (const r of replies) {
    const body = clean(r.body);
    if (body.length < 40) continue;             // skip one-liners, they carry no retrievable signal
    const t = titleOf[String(r.thread)];
    if (!t) continue;
    out.push({
      source: 'reply',
      refId: String(r._id),
      title: `Reply in "${t.title}"`,
      url: `/forums/${t._id}`,
      weight: 0,
      text: `In the forum thread "${t.title}", ${r.author?.name ?? 'a member'} replied: ${body}`,
    });
  }
  return out;
}

/* ───────────────────────────── index building ───────────────────────────── */

/**
 * Rebuild the whole index. `onProgress` receives short status strings so both
 * the CLI and the admin endpoint can report what is happening.
 */
export async function rebuildIndex({ onProgress = () => {} } = {}) {
  const started = Date.now();
  const groups = [
    ['items', itemChunks],
    ['heroes', heroChunks],
    ['builds and guides', buildChunks],
    ['forum posts', forumChunks],
  ];

  const docs = [];
  for (const [label, fn] of groups) {
    try {
      const part = await fn();
      docs.push(...part);
      onProgress(`collected ${part.length} chunks from ${label}`);
    } catch (e) {
      onProgress(`skipped ${label}: ${e.message}`);
    }
  }
  if (!docs.length) throw new Error('nothing to index');

  onProgress(`embedding ${docs.length} chunks…`);
  const BATCH = 32;
  const withVectors = [];
  for (let i = 0; i < docs.length; i += BATCH) {
    const slice = docs.slice(i, i + BATCH);
    const vectors = await embed(slice.map(d => d.text));
    slice.forEach((d, k) => withVectors.push({ ...d, embedding: vectors[k] }));
    onProgress(`embedded ${Math.min(i + BATCH, docs.length)}/${docs.length}`);
  }

  await Chunk.deleteMany({});
  await Chunk.insertMany(withVectors);
  invalidateCache();

  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  onProgress(`indexed ${withVectors.length} chunks in ${seconds}s`);
  return { chunks: withVectors.length, seconds: Number(seconds) };
}

/** Re-index a single build in place. Called after publish/edit, fire-and-forget. */
export async function reindexBuild(buildId) {
  const all = await buildChunks();
  const mine = all.filter(c => c.refId === String(buildId));
  await Chunk.deleteMany({ refId: String(buildId), source: { $in: ['build', 'guide'] } });
  if (!mine.length) { invalidateCache(); return 0; }
  const vectors = await embed(mine.map(d => d.text));
  await Chunk.insertMany(mine.map((d, i) => ({ ...d, embedding: vectors[i] })));
  invalidateCache();
  return mine.length;
}

/* ─────────────────────────────── retrieval ─────────────────────────────── */

// Chunks are held in memory for the similarity scan. Small corpus, so this is
// a few megabytes; the cache is dropped whenever the index changes.
let cache = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

export function invalidateCache() {
  cache = null;
}

async function loadChunks() {
  if (cache && Date.now() - cacheTime < CACHE_TTL) return cache;
  cache = await Chunk.find().lean();
  cacheTime = Date.now();
  return cache;
}

export async function indexStats() {
  const total = await Chunk.estimatedDocumentCount();
  const bySource = await Chunk.aggregate([{ $group: { _id: '$source', n: { $sum: 1 } } }]);
  const newest = await Chunk.findOne().sort({ updatedAt: -1 }).select('updatedAt').lean();
  return {
    total,
    bySource: Object.fromEntries(bySource.map(s => [s._id, s.n])),
    updatedAt: newest?.updatedAt ?? null,
  };
}

/**
 * Top-k passages for a question.
 * @param {string} query
 * @param {{k?: number, pinBuildId?: string, pinHero?: string}} opts
 */
export async function retrieve(query, { k = 12, pinBuildId = null, pinHero = null } = {}) {
  const chunks = await loadChunks();
  if (!chunks.length) return [];

  const q = await embedOne(query);

  const scored = chunks.map(c => ({
    chunk: c,
    similarity: cosine(q, c.embedding),
    score: cosine(q, c.embedding) + WEIGHT_BOOST * (c.weight ?? 0),
  })).sort((a, b) => b.score - a.score);

  const picked = [];
  const seen = new Set();
  const used = {};

  // Whatever the reader is currently looking at goes in first — the widget
  // passes this so "what should I buy next?" resolves against that build.
  const pin = c =>
    (pinBuildId && c.refId === String(pinBuildId) && ['build', 'guide'].includes(c.source)) ||
    (pinHero && c.source === 'hero' && c.title.toLowerCase() === String(pinHero).toLowerCase());

  for (const s of scored) {
    if (!pin(s.chunk)) continue;
    picked.push(s);
    seen.add(String(s.chunk._id));
  }

  // Then the best of each source, respecting the caps.
  for (const s of scored) {
    if (picked.length >= k) break;
    const id = String(s.chunk._id);
    if (seen.has(id)) continue;
    const src = s.chunk.source;
    if ((used[src] ?? 0) >= (SOURCE_CAPS[src] ?? 3)) continue;
    used[src] = (used[src] ?? 0) + 1;
    picked.push(s);
    seen.add(id);
  }

  // Fill any remaining slots from the global ranking, caps ignored.
  for (const s of scored) {
    if (picked.length >= k) break;
    const id = String(s.chunk._id);
    if (seen.has(id)) continue;
    picked.push(s);
    seen.add(id);
  }

  return picked.slice(0, k).map(s => ({
    source: s.chunk.source,
    title: s.chunk.title,
    text: s.chunk.text,
    url: s.chunk.url,
    similarity: Number(s.similarity.toFixed(4)),
  }));
}
