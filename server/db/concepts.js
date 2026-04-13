import { getDb } from '../../database/init.js';

export function getAllConcepts({ type } = {}) {
  const db = getDb();
  const where = type ? 'WHERE c.type = ?' : '';
  const params = type ? [type] : [];
  return db.prepare(`
    SELECT c.id, c.name, c.type, COUNT(ac.article_id) as articleCount
    FROM concepts c
    LEFT JOIN article_concepts ac ON ac.concept_id = c.id
    ${where}
    GROUP BY c.id ORDER BY articleCount DESC
  `).all(...params);
}

export function getConceptById(id) {
  const db = getDb();
  const concept = db.prepare('SELECT * FROM concepts WHERE id = ?').get(id);
  if (!concept) return null;
  const articles = db.prepare(`
    SELECT a.id, a.title, a.source, a.created_at FROM articles a
    JOIN article_concepts ac ON ac.article_id = a.id
    WHERE ac.concept_id = ?
  `).all(id);
  return { ...concept, articles };
}

export function upsertConcepts(articleId, extracted) {
  const db = getDb();
  const typeMap = {
    concepts: 'concept',
    tools: 'tool',
    persons: 'person',
    orgs: 'org',
  };

  const insertConcept = db.prepare(
    'INSERT OR IGNORE INTO concepts (name, type) VALUES (?, ?)'
  );
  const getConceptId = db.prepare(
    'SELECT id FROM concepts WHERE name = ?'
  );
  const linkConcept = db.prepare(
    'INSERT OR IGNORE INTO article_concepts (article_id, concept_id) VALUES (?, ?)'
  );

  db.transaction(() => {
    for (const [key, conceptType] of Object.entries(typeMap)) {
      const names = extracted[key] ?? [];
      for (const name of names) {
        const trimmed = name.trim();
        if (!trimmed) continue;
        insertConcept.run(trimmed, conceptType);
        const { id } = getConceptId.get(trimmed);
        linkConcept.run(articleId, id);
      }
    }
  })();
}

export function deleteOrphanConcepts() {
  const result = getDb().prepare(`
    DELETE FROM concepts
    WHERE id NOT IN (SELECT DISTINCT concept_id FROM article_concepts)
  `).run();
  return result.changes;
}
