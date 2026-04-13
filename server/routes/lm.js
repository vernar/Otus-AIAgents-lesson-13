import { Router } from 'express';
import { listModels } from '../lm/client.js';

const router = Router();

router.get('/models', async (req, res) => {
  try {
    const models = await listModels();
    res.json({ models });
  } catch (e) {
    res.status(503).json({ error: 'lm_studio_unavailable', message: e.message });
  }
});

router.get('/status', async (req, res) => {
  try {
    const models = await listModels();
    res.json({ online: true, models });
  } catch (e) {
    res.json({ online: false, error: e.message });
  }
});

export default router;
