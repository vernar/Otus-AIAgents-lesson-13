import { Router } from 'express';
import { getAllConcepts, getConceptById } from '../db/concepts.js';

const router = Router();

router.get('/', (req, res) => {
  const { type } = req.query;
  const allowed = ['concept', 'tool', 'person', 'org'];
  res.json(getAllConcepts({ type: allowed.includes(type) ? type : undefined }));
});

router.get('/:id', (req, res) => {
  const concept = getConceptById(Number(req.params.id));
  if (!concept) return res.status(404).json({ error: 'not_found' });
  res.json(concept);
});

export default router;
