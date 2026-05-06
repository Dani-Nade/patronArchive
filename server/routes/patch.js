import { Router } from 'express';
import { patchState } from '../utils/patchStore.js';

const router = Router();

/* GET /api/patch */
router.get('/', (_req, res) => {
  res.json({
    success: true,
    patch: patchState.version,
    source: patchState.source,
    updatedAt: patchState.updatedAt,
    lastChecked: patchState.lastChecked,
  });
});

export default router;
