import { getDb } from '../../database/init.js';

export function getAllArticles({ page = 1, limit = 20 } = {}) {
  const db = getDb();
  const offset = (page - 1) * limit;
  const data = db.prepare(`
    SELECT id, title, source, sentiment, summary, created_at
    FROM articles ORDER BY created_at DESC LIMIT ? OFFSET ?
  `).all(limit, offset);
  const { total } = db.prepare('SELECT COUNT(*) as total FROM articles').get();
  return { data, total, page, limit };
}

export function getArticleById(id) {
  const db = getDb();
  const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(id);
  if (!article) return null;
  article.tags = article.tags ? JSON.parse(article.tags) : [];
  const concepts = db.prepare(`
    SELECT c.id, c.name, c.type FROM concepts c
    JOIN article_concepts ac ON ac.concept_id = c.id
    WHERE ac.article_id = ?
  `).all(id);
  return { ...article, concepts };
}

export function insertArticle({ title, content, source }) {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO articles (title, content, source) VALUES (?, ?, ?)
  `).run(title, content, source || null);
  return result.lastInsertRowid;
}

export function updateArticleAnalysis(id, { summary, sentiment }) {
  getDb().prepare(`
    UPDATE articles SET summary = ?, sentiment = ? WHERE id = ?
  `).run(summary || null, sentiment || null, id);
}

export function deleteArticle(id) {
  return getDb().prepare('DELETE FROM articles WHERE id = ?').run(id);
}
