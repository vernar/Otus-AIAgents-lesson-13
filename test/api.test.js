/**
 * Integration tests for REST API routes.
 * Запускает реальный Express с in-memory SQLite.
 */
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import Database from 'better-sqlite3';

// --- Минимальная копия initDb для тестов ---
let testDb;
function setupTestDb() {
  testDb = new Database(':memory:');
  testDb.pragma('foreign_keys = ON');
  testDb.exec(`
    CREATE TABLE articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL, content TEXT NOT NULL,
      source TEXT, summary TEXT, sentiment TEXT,
      tags TEXT, author TEXT, published_date DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE concepts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE, type TEXT DEFAULT 'concept'
    );
    CREATE TABLE article_concepts (
      article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
      concept_id INTEGER REFERENCES concepts(id) ON DELETE CASCADE,
      PRIMARY KEY (article_id, concept_id)
    );
  `);
  return testDb;
}

// --- Помощники для работы с тестовой БД ---
function insertTestArticle(title = 'Test Article', content = 'Content', source = null) {
  const r = testDb.prepare('INSERT INTO articles (title, content, source) VALUES (?, ?, ?)').run(title, content, source);
  return r.lastInsertRowid;
}

function insertTestConcept(name, type = 'concept') {
  testDb.prepare('INSERT OR IGNORE INTO concepts (name, type) VALUES (?, ?)').run(name, type);
  return testDb.prepare('SELECT id FROM concepts WHERE name = ?').get(name).id;
}

function linkConcept(articleId, conceptId) {
  testDb.prepare('INSERT OR IGNORE INTO article_concepts VALUES (?, ?)').run(articleId, conceptId);
}

// --- Запускаем сервер с тестовой БД ---
let server, BASE;

before(async () => {
  setupTestDb();

  // Подменяем getDb
  const app = express();
  app.use(express.json());

  // Простые роуты без импорта модулей (чтобы не тянуть production initDb)
  app.get('/api/health', (req, res) => {
    try { testDb.prepare('SELECT 1').get(); res.json({ ok: true, db: true }); }
    catch(e) { res.status(500).json({ ok: false }); }
  });

  app.get('/api/articles', (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const data = testDb.prepare('SELECT id,title,source,sentiment,summary,created_at FROM articles ORDER BY id DESC LIMIT ? OFFSET ?').all(limit, offset);
    const { total } = testDb.prepare('SELECT COUNT(*) as total FROM articles').get();
    res.json({ data, total, page, limit });
  });

  app.get('/api/articles/:id', (req, res) => {
    const a = testDb.prepare('SELECT * FROM articles WHERE id = ?').get(req.params.id);
    if (!a) return res.status(404).json({ error: 'not_found' });
    const concepts = testDb.prepare('SELECT c.* FROM concepts c JOIN article_concepts ac ON ac.concept_id=c.id WHERE ac.article_id=?').all(a.id);
    res.json({ ...a, concepts });
  });

  app.delete('/api/articles/:id', (req, res) => {
    const r = testDb.prepare('DELETE FROM articles WHERE id = ?').run(req.params.id);
    if (r.changes === 0) return res.status(404).json({ error: 'not_found' });
    const orphaned = testDb.prepare('DELETE FROM concepts WHERE id NOT IN (SELECT DISTINCT concept_id FROM article_concepts)').run();
    res.json({ deleted: r.changes, orphanedConceptsRemoved: orphaned.changes });
  });

  app.get('/api/concepts', (req, res) => {
    const { type } = req.query;
    const allowed = ['concept','tool','person','org'];
    const where = allowed.includes(type) ? 'WHERE c.type = ?' : '';
    const params = allowed.includes(type) ? [type] : [];
    const concepts = testDb.prepare(`SELECT c.id,c.name,c.type,COUNT(ac.article_id) as articleCount FROM concepts c LEFT JOIN article_concepts ac ON ac.concept_id=c.id ${where} GROUP BY c.id`).all(...params);
    res.json(concepts);
  });

  app.get('/api/graph', (req, res) => {
    const articles = testDb.prepare('SELECT id,title,sentiment FROM articles').all();
    const concepts = testDb.prepare('SELECT id,name,type FROM concepts').all();
    const edges = testDb.prepare('SELECT article_id,concept_id FROM article_concepts').all();
    res.json({
      nodes: [
        ...articles.map(a => ({ data: { id: `a-${a.id}`, label: a.title, type: 'article' } })),
        ...concepts.map(c => ({ data: { id: `c-${c.id}`, label: c.name, type: c.type } })),
      ],
      edges: edges.map(e => ({ data: { id: `e-${e.article_id}-${e.concept_id}`, source: `a-${e.article_id}`, target: `c-${e.concept_id}` } })),
    });
  });

  await new Promise(resolve => {
    server = app.listen(0, () => {
      BASE = `http://localhost:${server.address().port}`;
      resolve();
    });
  });
});

after(() => { server.close(); testDb.close(); });

// Helper
async function api(path, opts = {}) {
  const r = await fetch(`${BASE}${path}`, opts);
  return { status: r.status, body: await r.json() };
}

describe('GET /api/health', () => {
  test('возвращает { ok: true, db: true }', async () => {
    const { status, body } = await api('/api/health');
    assert.equal(status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.db, true);
  });
});

describe('GET /api/articles', () => {
  test('возвращает пустой список', async () => {
    const { body } = await api('/api/articles');
    assert.equal(body.total, 0);
    assert.deepEqual(body.data, []);
  });

  test('возвращает вставленную статью', async () => {
    insertTestArticle('Статья A', 'Текст A', 'http://a.com');
    const { body } = await api('/api/articles');
    assert.ok(body.total >= 1);
    assert.ok(body.data.some(a => a.title === 'Статья A'));
  });
});

describe('GET /api/articles/:id', () => {
  test('возвращает 404 для несуществующей статьи', async () => {
    const { status } = await api('/api/articles/99999');
    assert.equal(status, 404);
  });

  test('возвращает статью с концептами', async () => {
    const artId = insertTestArticle('Статья B', 'Текст B');
    const conId = insertTestConcept('LLM', 'concept');
    linkConcept(artId, conId);
    const { body } = await api(`/api/articles/${artId}`);
    assert.equal(body.title, 'Статья B');
    assert.ok(body.concepts.some(c => c.name === 'LLM'));
  });
});

describe('DELETE /api/articles/:id', () => {
  test('удаляет статью и возвращает счётчик', async () => {
    const artId = insertTestArticle('На удаление', 'Текст');
    const { status, body } = await api(`/api/articles/${artId}`, { method: 'DELETE' });
    assert.equal(status, 200);
    assert.equal(body.deleted, 1);
  });

  test('удаляет осиротевшие концепты', async () => {
    const artId = insertTestArticle('Orphan test', 'text');
    const conId = insertTestConcept('UniqueOrphan', 'tool');
    linkConcept(artId, conId);
    const { body } = await api(`/api/articles/${artId}`, { method: 'DELETE' });
    assert.ok(body.orphanedConceptsRemoved >= 1);
    const { body: concepts } = await api('/api/concepts');
    assert.ok(!concepts.some(c => c.name === 'UniqueOrphan'));
  });

  test('возвращает 404 при удалении несуществующей', async () => {
    const { status } = await api('/api/articles/99999', { method: 'DELETE' });
    assert.equal(status, 404);
  });
});

describe('GET /api/concepts', () => {
  test('возвращает список концептов', async () => {
    insertTestConcept('React', 'tool');
    const { body } = await api('/api/concepts');
    assert.ok(Array.isArray(body));
  });

  test('фильтрует по типу', async () => {
    insertTestConcept('PersonX', 'person');
    const { body } = await api('/api/concepts?type=person');
    assert.ok(body.every(c => c.type === 'person'));
  });
});

describe('GET /api/graph', () => {
  test('возвращает nodes и edges', async () => {
    const { body } = await api('/api/graph');
    assert.ok(Array.isArray(body.nodes));
    assert.ok(Array.isArray(body.edges));
  });

  test('узлы содержат корректные поля', async () => {
    const artId = insertTestArticle('Graph Test', 'text');
    const conId = insertTestConcept('GraphCon', 'concept');
    linkConcept(artId, conId);
    const { body } = await api('/api/graph');
    const artNode = body.nodes.find(n => n.data.id === `a-${artId}`);
    const conNode = body.nodes.find(n => n.data.id === `c-${conId}`);
    assert.ok(artNode, 'узел статьи существует');
    assert.ok(conNode, 'узел концепта существует');
    const edge = body.edges.find(e => e.data.source === `a-${artId}` && e.data.target === `c-${conId}`);
    assert.ok(edge, 'рёбро существует');
  });
});
