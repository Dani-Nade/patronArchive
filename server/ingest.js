import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { rebuildIndex, indexStats } from './utils/rag.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error('✗ MONGO_URI not set in server/.env — the index lives in MongoDB');
  process.exit(1);
}

console.log('The Patron\'s Archive — building the assistant\'s knowledge base\n');

await mongoose.connect(MONGO_URI);
console.log('✓ MongoDB connected');

try {
  const { chunks, seconds } = await rebuildIndex({ onProgress: m => console.log('  ·', m) });
  const stats = await indexStats();

  console.log(`\n✓ Indexed ${chunks} chunks in ${seconds}s\n`);
  console.log('── By source ────────────────────────────────');
  for (const [source, n] of Object.entries(stats.bySource).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${source.padEnd(8)} ${String(n).padStart(5)}`);
  }
  console.log('─────────────────────────────────────────────');
  console.log('\nThe assistant is ready. Set ANTHROPIC_API_KEY in server/.env if you have not already.');
} catch (e) {
  console.error('\n✗ Indexing failed:', e.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
