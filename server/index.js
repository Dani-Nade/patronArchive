// Loaded first: ES module imports are evaluated before this file's body, so
// config must be read here for the route modules to see it.
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

import authRoutes        from './routes/auth.js';
import buildsRoutes      from './routes/builds.js';
import commentsRoutes    from './routes/comments.js';
import itemsRoutes       from './routes/items.js';
import heroesRoutes      from './routes/heroes.js';
import youtubeRoutes     from './routes/youtube.js';
import sightengineRoutes from './routes/sightengine.js';
import adminRoutes       from './routes/admin.js';
import patchRoutes       from './routes/patch.js';
import forumsRoutes      from './routes/forums.js';
import chatRoutes        from './routes/chat.js';
import errorHandler      from './middleware/errorHandler.js';
import { warmUp }        from './utils/embeddings.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_, res) => res.json({ success: true, status: 'ok' }));

app.use('/api/auth',        authRoutes);
app.use('/api/builds',      buildsRoutes);
app.use('/api/comments',    commentsRoutes);
app.use('/api/items',       itemsRoutes);
app.use('/api/heroes',      heroesRoutes);
app.use('/api/youtube',     youtubeRoutes);
app.use('/api/sightengine', sightengineRoutes);
app.use('/api/admin',       adminRoutes);
app.use('/api/patch',       patchRoutes);
app.use('/api/forums',      forumsRoutes);
app.use('/api/chat',        chatRoutes);

app.use(errorHandler);

const PORT      = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

async function start() {
  if (MONGO_URI) {
    try {
      await mongoose.connect(MONGO_URI);
      console.log('✓ MongoDB connected');
    } catch (e) {
      console.error('✗ MongoDB connection failed:', e.message);
      console.warn('  Server will run without persistence — set MONGO_URI in .env');
    }
  } else {
    console.warn('! No MONGO_URI configured — running without database');
  }
  warmUp();   // load the embedder in the background, ahead of the first question
  app.listen(PORT, () => console.log(`✓ Server: http://localhost:${PORT}`));
}

start();
