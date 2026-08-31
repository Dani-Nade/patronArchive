import mongoose from 'mongoose';
import { DIMENSION } from '../utils/embeddings.js';

/*
 * One retrievable passage of the knowledge base, with its embedding.
 * The corpus is small (roughly a thousand chunks), so retrieval is a brute-force
 * cosine scan in process rather than a vector index.
 */
const chunkSchema = new mongoose.Schema({
  source: {
    type: String,
    enum: ['item', 'hero', 'build', 'guide', 'thread', 'reply'],
    required: true,
    index: true,
  },
  // Id of the document this came from — a Mongo _id for builds and threads,
  // the upstream asset id for items and heroes.
  refId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  text:  { type: String, required: true },
  // In-app link so answers can point at the source.
  url:   { type: String, default: '' },
  // Popularity signal normalised to 0..1, used to float top-rated builds.
  weight: { type: Number, default: 0 },
  embedding: {
    type: [Number],
    required: true,
    validate: {
      validator: v => v.length === DIMENSION,
      message: `embedding must have ${DIMENSION} dimensions`,
    },
  },
}, { timestamps: true });

chunkSchema.index({ source: 1, refId: 1 });

export default mongoose.model('Chunk', chunkSchema);
