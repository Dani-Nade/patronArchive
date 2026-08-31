import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import auth, { requireAdmin } from '../middleware/auth.js';
import { retrieve, rebuildIndex, indexStats } from '../utils/rag.js';
import { isReady, warmUp } from '../utils/embeddings.js';
import { track, trackError } from '../utils/apiTracker.js';

const router = Router();

const MODEL      = 'claude-opus-5';
const EFFORT     = process.env.CHAT_EFFORT || 'medium';   // low | medium | high | xhigh | max
const MAX_TOKENS = 8000;      // headroom for adaptive thinking; the prompt keeps answers short
const MAX_TURNS  = 8;         // history kept per conversation
const TOP_K      = 12;

let client = null;
function anthropic() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  client ??= new Anthropic();   // reads ANTHROPIC_API_KEY from the environment
  return client;
}

/* ─── crude in-process rate limit, so an open endpoint can't run up a bill ─── */
const WINDOW = 10 * 60 * 1000;
const LIMIT_ANON = 15;
const LIMIT_USER = 60;
const hits = new Map();

function rateLimited(key, limit) {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter(t => now - t < WINDOW);
  list.push(now);
  hits.set(key, list);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some(t => now - t < WINDOW)) hits.delete(k);
  return list.length > limit;
}

/** Reads the JWT when one is present, but never rejects — guests may ask too. */
async function optionalAuth(req, _res, next) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
    } catch { /* an invalid token just means the caller is treated as a guest */ }
  }
  next();
}

/* ───────────────────────────── prompt assembly ───────────────────────────── */

const SYSTEM = `You are the Archivist, the in-app assistant for The Patron's Archive — a community hub for the game Deadlock where players publish hero builds, item loadouts and written strategy guides.

You help players with build advice, what to buy next, item choices, matchups and general strategy.

Grounding rules, in order of importance:
1. Answer from the CONTEXT passages provided in the user turn. They are drawn from the site's live item and hero catalogue, its published community builds and guides, and its forum discussion.
2. Never invent an item name, an item cost, a hero name or a hero ability. If a specific number or name is not in the context, say you do not have it rather than guessing. Item costs in souls must be quoted exactly as they appear in the context.
3. When the context does not cover the question, say so plainly and answer only as far as the context allows. Do not fill the gap with general game knowledge presented as fact about Deadlock.
4. Distinguish sources. Catalogue passages (items, heroes) are authoritative site data. Build guides and forum replies are individual players' opinions — attribute them ("the Glass Cannon Haze guide suggests…", "one forum reply argues…") rather than stating them as settled fact.
5. Higher-rated community builds appear earlier in the context. Prefer them when recommending, and say when a suggestion comes from a well-rated build.

Style:
- Be concise and direct. Two or three short paragraphs at most, or a short list. This renders in a small chat panel.
- Lead with the actual recommendation, then the reasoning.
- Use plain prose. No headings. Light markdown only: **bold** for item names, and - for list items.
- Talk like a knowledgeable player, not a manual.
- If the player is looking at a specific build, treat it as the subject of the conversation unless they say otherwise.`;

function buildContextBlock(passages, page) {
  if (!passages.length) {
    return 'CONTEXT: (the knowledge base is empty — tell the player the index has not been built yet)';
  }
  const label = {
    item: 'ITEM CATALOGUE', hero: 'HERO CATALOGUE', build: 'COMMUNITY BUILD',
    guide: 'BUILD GUIDE', thread: 'FORUM THREAD', reply: 'FORUM REPLY',
  };
  const body = passages
    .map((p, i) => `[${i + 1}] (${label[p.source] ?? p.source}) ${p.title}\n${p.text}`)
    .join('\n\n');
  const where = page ? `\n\nThe player is currently viewing: ${page}.` : '';
  return `CONTEXT — passages retrieved from The Patron's Archive for this question:\n\n${body}${where}`;
}

/* ────────────────────────────────── routes ────────────────────────────────── */

/* GET /api/chat/status — lets the widget render an honest state before asking */
router.get('/status', async (_req, res, next) => {
  try {
    const stats = await indexStats();
    res.json({
      success: true,
      configured: !!process.env.ANTHROPIC_API_KEY,
      embedderReady: isReady(),
      index: stats,
    });
  } catch (e) { next(e); }
});

/* POST /api/chat — streams the answer back as server-sent events */
router.post('/', optionalAuth, async (req, res) => {
  const ai = anthropic();
  if (!ai) {
    return res.status(503).json({
      success: false,
      error: 'The assistant is not configured. Set ANTHROPIC_API_KEY in server/.env.',
    });
  }

  const key = req.user ? `u:${req.user._id}` : `ip:${req.ip}`;
  if (rateLimited(key, req.user ? LIMIT_USER : LIMIT_ANON)) {
    return res.status(429).json({
      success: false,
      error: req.user
        ? 'You have hit the message limit for now. Try again in a few minutes.'
        : 'Message limit reached. Log in for a higher limit, or try again in a few minutes.',
    });
  }

  const { message, history = [], page = null, buildId = null, hero = null } = req.body ?? {};
  if (!message?.trim()) {
    return res.status(400).json({ success: false, error: 'message is required' });
  }

  let passages = [];
  try {
    passages = await retrieve(message.trim(), { k: TOP_K, pinBuildId: buildId, pinHero: hero });
  } catch (e) {
    return res.status(500).json({ success: false, error: `Retrieval failed: ${e.message}` });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  // Surface the sources immediately so the panel can show them while it streams.
  send({ type: 'sources', sources: passages.map(({ source, title, url, similarity }) => ({ source, title, url, similarity })) });

  const turns = history
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-MAX_TURNS)
    .map(m => ({ role: m.role, content: m.content }));

  const messages = [
    ...turns,
    { role: 'user', content: `${buildContextBlock(passages, page)}\n\nPLAYER QUESTION: ${message.trim()}` },
  ];

  let stream;
  try {
    track('anthropic');
    stream = ai.messages.stream({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM,
      thinking: { type: 'adaptive' },
      output_config: { effort: EFFORT },
      messages,
    });

    // Stop billing for a reply nobody is going to read.
    req.on('close', () => { try { stream.abort(); } catch { /* already settled */ } });

    stream.on('text', (delta) => send({ type: 'delta', text: delta }));

    const final = await stream.finalMessage();

    if (final.stop_reason === 'refusal') {
      send({ type: 'error', error: 'I can\'t help with that one. Try rephrasing, or ask something else about builds or strategy.' });
    } else {
      send({
        type: 'done',
        usage: {
          input: final.usage?.input_tokens ?? 0,
          output: final.usage?.output_tokens ?? 0,
        },
      });
    }
  } catch (e) {
    trackError('anthropic');
    const message = e instanceof Anthropic.RateLimitError
      ? 'The assistant is rate limited right now. Give it a moment and try again.'
      : e instanceof Anthropic.AuthenticationError
        ? 'The assistant\'s API key was rejected. Check ANTHROPIC_API_KEY in server/.env.'
        : e?.message ?? 'The assistant failed to respond.';
    send({ type: 'error', error: message });
  } finally {
    res.end();
  }
});

/* POST /api/chat/reindex — admin only, rebuilds the whole knowledge base */
router.post('/reindex', auth, requireAdmin, async (req, res, next) => {
  try {
    warmUp();
    const log = [];
    const result = await rebuildIndex({ onProgress: m => { log.push(m); console.log('  [rag]', m); } });
    res.json({ success: true, ...result, log });
  } catch (e) { next(e); }
});

export default router;
