import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import auth, { requireAdmin } from '../middleware/auth.js';
import { retrieve, rebuildIndex, indexStats } from '../utils/rag.js';
import { isReady, warmUp } from '../utils/embeddings.js';
import { track, trackError } from '../utils/apiTracker.js';

const router = Router();

/*
 * Two interchangeable generation backends:
 *
 *   local     — any OpenAI-compatible server on this machine (LM Studio, Ollama,
 *               llama.cpp). Free, offline, and the default when no Anthropic key
 *               is present.
 *   anthropic — claude-opus-5. Better answers, billed per token.
 *
 * Retrieval is identical either way; only the final call differs.
 */
const ANTHROPIC_MODEL   = 'claude-opus-5';
const ANTHROPIC_MAX     = 8000;   // headroom for adaptive thinking
const LOCAL_MAX         = 700;    // small models ramble; the prompt asks for brevity anyway
const LOCAL_PASSAGE_MAX = 700;

/*
 * Read the environment on every call rather than once at module load. ES module
 * imports are evaluated before the body of index.js runs, so anything captured at
 * import time is captured before dotenv.config() has read server/.env — which
 * silently ignored every setting below.
 */
function cfg() {
  const provider = (process.env.CHAT_PROVIDER
    || (process.env.ANTHROPIC_API_KEY ? 'anthropic' : 'local')).toLowerCase();
  return {
    provider,
    localUrl: (process.env.LOCAL_LLM_URL || 'http://localhost:1234/v1').replace(/\/+$/, ''),
    localModel: process.env.LOCAL_LLM_MODEL || '',   // blank = ask the server what it has
    effort: process.env.CHAT_EFFORT || 'medium',
    // A 7-8B model on a 4k context cannot take twelve passages and still have
    // room to answer, so the local path retrieves fewer and trims each one.
    topK: provider === 'local' ? 6 : 12,
  };
}

const MAX_TURNS = 8;

let anthropicClient = null;
function anthropic() {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  anthropicClient ??= new Anthropic();
  return anthropicClient;
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

/* Smaller local models weight the end of the prompt most heavily, and they
 * confabulate confidently when the context is silent — inventing ability
 * cooldowns was the observed failure. Repeating the hard rules immediately
 * before the question, rather than only in the system prompt, is what makes
 * them stick. */
const LOCAL_REMINDER = `
RULES — apply these before you answer:
- If a number, item effect, cooldown, ability or hero detail is not written in the CONTEXT above, you do not know it. Say so and stop. Do not estimate it, and do not reason it out from general knowledge of the game.
- Only name items and heroes that appear in the CONTEXT.
- Copy every number exactly as the CONTEXT writes it. Do not round, convert or restate it in your own terms.
- It is correct and useful to answer "the Archive doesn't cover that". It is never acceptable to guess.`;

function buildContextBlock(passages, page, provider) {
  if (!passages.length) {
    return 'CONTEXT: (the knowledge base is empty — tell the player the index has not been built yet)';
  }
  const label = {
    item: 'ITEM CATALOGUE', hero: 'HERO CATALOGUE', build: 'COMMUNITY BUILD',
    guide: 'BUILD GUIDE', thread: 'FORUM THREAD', reply: 'FORUM REPLY',
  };
  const trim = t => (provider === 'local' && t.length > LOCAL_PASSAGE_MAX
    ? `${t.slice(0, LOCAL_PASSAGE_MAX)}…`
    : t);
  const body = passages
    .map((p, i) => `[${i + 1}] (${label[p.source] ?? p.source}) ${p.title}\n${trim(p.text)}`)
    .join('\n\n');
  const where = page ? `\n\nThe player is currently viewing: ${page}.` : '';
  const reminder = provider === 'local' ? `\n${LOCAL_REMINDER}` : '';
  return `CONTEXT — passages retrieved from The Patron's Archive for this question:\n\n${body}${where}${reminder}`;
}

/* ────────────────────────── local (OpenAI-compatible) ────────────────────────── */

let discovered = { url: null, model: null };

async function localModels(url) {
  const res = await fetch(`${url}/models`, { signal: AbortSignal.timeout(4000) });
  if (!res.ok) throw new Error(`model list returned ${res.status}`);
  const body = await res.json();
  return (body.data ?? []).map(m => m.id);
}

/** Picks the configured model, or the first non-embedding one the server offers. */
async function resolveLocalModel(c) {
  if (c.localModel) return c.localModel;
  if (discovered.url === c.localUrl && discovered.model) return discovered.model;
  const ids = await localModels(c.localUrl);
  const chat = ids.find(id => !/embed/i.test(id));
  if (!chat) throw new Error('the local server has no chat model loaded');
  discovered = { url: c.localUrl, model: chat };
  return chat;
}

/* Reasoning models (qwen3 and friends) emit <think>…</think> before the answer.
 * Strip it as it streams, holding back just enough to catch a split tag. */
const OPEN = '<think>', CLOSE = '</think>';
function makeThinkStripper() {
  let buf = '', inside = false;
  const keep = Math.max(OPEN.length, CLOSE.length) - 1;
  return function push(chunk, flush = false) {
    buf += chunk;
    let out = '';
    for (;;) {
      if (inside) {
        const i = buf.indexOf(CLOSE);
        if (i === -1) { buf = buf.slice(Math.max(0, buf.length - keep)); break; }
        buf = buf.slice(i + CLOSE.length);
        inside = false;
      } else {
        const i = buf.indexOf(OPEN);
        if (i === -1) {
          const n = flush ? buf.length : Math.max(0, buf.length - keep);
          out += buf.slice(0, n);
          buf = buf.slice(n);
          break;
        }
        out += buf.slice(0, i);
        buf = buf.slice(i + OPEN.length);
        inside = true;
      }
    }
    return out;
  };
}

async function streamLocal({ messages, onDelta, signal, cfg: c }) {
  const model = await resolveLocalModel(c);
  const res = await fetch(`${c.localUrl}/chat/completions`, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: SYSTEM }, ...messages],
      stream: true,
      temperature: 0.15,      // low: the job is to stay on the passages, not to be creative
      max_tokens: LOCAL_MAX,
    }),
  });
  if (!res.ok || !res.body) {
    throw new Error(`local model server returned ${res.status} — ${(await res.text().catch(() => '')).slice(0, 200)}`);
  }

  const reader  = res.body.getReader();
  const decoder = new TextDecoder();
  const strip   = makeThinkStripper();
  let buffer = '', output = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n');
    buffer = parts.pop() ?? '';
    for (const raw of parts) {
      const line = raw.trim();
      if (!line.startsWith('data:')) continue;
      const payload = line.slice(5).trim();
      if (payload === '[DONE]') continue;
      let evt;
      try { evt = JSON.parse(payload); } catch { continue; }
      const piece = evt.choices?.[0]?.delta?.content;
      if (!piece) continue;
      output += 1;
      const visible = strip(piece);
      if (visible) onDelta(visible);
    }
  }
  const tail = strip('', true);
  if (tail) onDelta(tail);
  return { model, usage: { input: 0, output } };
}

async function streamAnthropic({ messages, onDelta, onStream, cfg: c }) {
  const ai = anthropic();
  const stream = ai.messages.stream({
    model: ANTHROPIC_MODEL,
    max_tokens: ANTHROPIC_MAX,
    system: SYSTEM,
    thinking: { type: 'adaptive' },
    output_config: { effort: c.effort },
    messages,
  });
  onStream?.(stream);
  stream.on('text', onDelta);
  const final = await stream.finalMessage();
  return {
    model: ANTHROPIC_MODEL,
    refused: final.stop_reason === 'refusal',
    usage: { input: final.usage?.input_tokens ?? 0, output: final.usage?.output_tokens ?? 0 },
  };
}

/** Whether the configured backend can actually serve a request right now. */
async function providerHealth(c = cfg()) {
  if (c.provider === 'anthropic') {
    return process.env.ANTHROPIC_API_KEY
      ? { ok: true, model: ANTHROPIC_MODEL }
      : { ok: false, reason: 'Set ANTHROPIC_API_KEY in server/.env, or set CHAT_PROVIDER=local to use a model on this machine.' };
  }
  try {
    const model = await resolveLocalModel(c);
    return { ok: true, model };
  } catch (e) {
    return {
      ok: false,
      reason: `No local model server at ${c.localUrl} (${e.message}). Start LM Studio's server, or Ollama, and load a chat model.`,
    };
  }
}

/* ────────────────────────────────── routes ────────────────────────────────── */

/* GET /api/chat/status — lets the widget render an honest state before asking */
router.get('/status', async (_req, res, next) => {
  try {
    const c = cfg();
    const [stats, health] = await Promise.all([indexStats(), providerHealth(c)]);
    res.json({
      success: true,
      configured: health.ok,
      provider: c.provider,
      model: health.model ?? null,
      reason: health.reason ?? null,
      embedderReady: isReady(),
      index: stats,
    });
  } catch (e) { next(e); }
});

/* POST /api/chat — streams the answer back as server-sent events */
router.post('/', optionalAuth, async (req, res) => {
  const c = cfg();
  const health = await providerHealth(c);
  if (!health.ok) return res.status(503).json({ success: false, error: health.reason });

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
    passages = await retrieve(message.trim(), { k: c.topK, pinBuildId: buildId, pinHero: hero });
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
    { role: 'user', content: `${buildContextBlock(passages, page, c.provider)}\n\nPLAYER QUESTION: ${message.trim()}` },
  ];

  const controller = new AbortController();
  let anthropicStream = null;
  // Stop generating for a reply nobody is going to read.
  req.on('close', () => {
    controller.abort();
    try { anthropicStream?.abort(); } catch { /* already settled */ }
  });

  try {
    track(c.provider === 'local' ? 'local-llm' : 'anthropic');
    const onDelta = (text) => send({ type: 'delta', text });

    const result = c.provider === 'local'
      ? await streamLocal({ messages, onDelta, signal: controller.signal, cfg: c })
      : await streamAnthropic({ messages, onDelta, onStream: s => { anthropicStream = s; }, cfg: c });

    if (result.refused) {
      send({ type: 'error', error: 'I can\'t help with that one. Try rephrasing, or ask something else about builds or strategy.' });
    } else {
      send({ type: 'done', provider: c.provider, model: result.model, usage: result.usage });
    }
  } catch (e) {
    trackError(c.provider === 'local' ? 'local-llm' : 'anthropic');
    const text = e instanceof Anthropic.RateLimitError
      ? 'The assistant is rate limited right now. Give it a moment and try again.'
      : e instanceof Anthropic.AuthenticationError
        ? 'The assistant\'s API key was rejected. Check ANTHROPIC_API_KEY in server/.env.'
        : e?.name === 'AbortError'
          ? null
          : e?.message ?? 'The assistant failed to respond.';
    if (text) send({ type: 'error', error: text });
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
