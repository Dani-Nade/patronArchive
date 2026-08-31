import { pipeline, env } from '@huggingface/transformers';

/*
 * Local sentence embeddings. The model runs in-process, so the RAG index needs
 * no embedding API key and no network access once the weights are cached on disk
 * (~90 MB, downloaded on first use into node_modules/.cache).
 */

env.allowLocalModels = false;   // always resolve from the hub cache, never a local dir
env.useBrowserCache = false;

export const MODEL_ID  = 'Xenova/all-MiniLM-L6-v2';
export const DIMENSION = 384;

let extractorPromise = null;
let ready = false;

/** Loads the model once and reuses it. Concurrent callers share one load. */
function getExtractor() {
  if (!extractorPromise) {
    console.log(`… loading embedding model ${MODEL_ID} (first run downloads ~90 MB)`);
    extractorPromise = pipeline('feature-extraction', MODEL_ID)
      .then(p => { ready = true; console.log('✓ embedding model ready'); return p; })
      .catch(e => { extractorPromise = null; throw e; });
  }
  return extractorPromise;
}

export function isReady() {
  return ready;
}

/** Kick off the model load without blocking the caller. */
export function warmUp() {
  getExtractor().catch(e => console.error('✗ embedding model failed to load:', e.message));
}

/**
 * Embed one or more strings.
 * @param {string|string[]} input
 * @returns {Promise<number[][]>} mean-pooled, L2-normalised vectors
 */
export async function embed(input) {
  const texts = (Array.isArray(input) ? input : [input])
    .map(t => (t ?? '').toString().trim())
    .map(t => (t.length ? t : 'empty'));
  if (!texts.length) return [];

  const extractor = await getExtractor();
  const out = await extractor(texts, { pooling: 'mean', normalize: true });
  return out.tolist();
}

/** Embed a single string and return one vector. */
export async function embedOne(text) {
  const [vec] = await embed(text);
  return vec;
}

/**
 * Cosine similarity. Both vectors are already L2-normalised by `embed`,
 * so the dot product is the cosine.
 */
export function cosine(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}
