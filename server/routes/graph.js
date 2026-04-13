import { Router } from 'express';
import { getDb } from '../../database/init.js';

const router = Router();

router.get('/', (req, res) => {
  const db = getDb();
  const { type } = req.query;
  const allowed = ['concept', 'tool', 'person', 'org'];
  const typeFilter = allowed.includes(type) ? type : null;

  const articles = db.prepare('SELECT id, title, sentiment FROM articles').all();

  const conceptsQuery = typeFilter
    ? 'SELECT id, name, type FROM concepts WHERE type = ?'
    : 'SELECT id, name, type FROM concepts';
  const concepts = db.prepare(conceptsQuery).all(...(typeFilter ? [typeFilter] : []));

  const edges = db.prepare(`
    SELECT ac.article_id, ac.concept_id
    FROM article_concepts ac
    ${typeFilter ? 'JOIN concepts c ON c.id = ac.concept_id WHERE c.type = ?' : ''}
  `).all(...(typeFilter ? [typeFilter] : []));

  const nodes = [
    ...articles.map(a => ({
      data: { id: `a-${a.id}`, label: a.title, type: 'article', sentiment: a.sentiment },
    })),
    ...concepts.map(c => ({
      data: { id: `c-${c.id}`, label: c.name, type: c.type },
    })),
  ];

  const edgeList = edges.map(e => ({
    data: { id: `e-${e.article_id}-${e.concept_id}`, source: `a-${e.article_id}`, target: `c-${e.concept_id}` },
  }));

  res.json({ nodes, edges: edgeList });
});

export default router;
