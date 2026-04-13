import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

// Используем временную in-memory БД для тестов
const TEST_DB_PATH = ':memory:';
let db;

// Переопределяем модуль init для тестов
const schema = `
  CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    source TEXT,
    author TEXT,
    published_date DATE,
    tags TEXT,
    summary TEXT,
    sentiment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS concepts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    type TEXT DEFAULT 'concept'
  );
  CREATE TABLE IF NOT EXISTS article_concepts (
    article_id INTEGER REFERENCES articles(id) ON DELETE CASCADE,
    concept_id INTEGER REFERENCES concepts(id) ON DELETE CASCADE,
    PRIMARY KEY (article_id, concept_id)
  );
`;

describe('Database helpers', () => {
  before(() => {
    db = new Database(TEST_DB_PATH);
    db.pragma('foreign_keys = ON');
    db.exec(schema);
  });

  after(() => { db.close(); });

  test('вставляет статью и читает её', () => {
    const r = db.prepare('INSERT INTO articles (title, content, source) VALUES (?, ?, ?)').run('Test', 'Content', 'http://test.com');
    assert.ok(r.lastInsertRowid > 0);
    const a = db.prepare('SELECT * FROM articles WHERE id = ?').get(r.lastInsertRowid);
    assert.equal(a.title, 'Test');
    assert.equal(a.source, 'http://test.com');
  });

  test('концепты вставляются с UPSERT (дублей нет)', () => {
    db.prepare('INSERT OR IGNORE INTO concepts (name, type) VALUES (?, ?)').run('LLM', 'concept');
    db.prepare('INSERT OR IGNORE INTO concepts (name, type) VALUES (?, ?)').run('LLM', 'concept');
    const count = db.prepare('SELECT COUNT(*) as n FROM concepts WHERE name = ?').get('LLM');
    assert.equal(count.n, 1);
  });

  test('удаление статьи каскадно удаляет article_concepts', () => {
    const art = db.prepare('INSERT INTO articles (title, content) VALUES (?, ?)').run('Del', 'Cont');
    const con = db.prepare('INSERT OR IGNORE INTO concepts (name, type) VALUES (?, ?)').run('DelCon', 'tool');
    const artId = art.lastInsertRowid;
    const conId = db.prepare('SELECT id FROM concepts WHERE name = ?').get('DelCon').id;
    db.prepare('INSERT OR IGNORE INTO article_concepts (article_id, concept_id) VALUES (?, ?)').run(artId, conId);

    db.prepare('DELETE FROM articles WHERE id = ?').run(artId);
    const link = db.prepare('SELECT * FROM article_concepts WHERE article_id = ?').get(artId);
    assert.equal(link, undefined);
  });

  test('orphan cleanup удаляет концепты без статей', () => {
    db.prepare('INSERT OR IGNORE INTO concepts (name, type) VALUES (?, ?)').run('Orphan', 'concept');
    const before = db.prepare('SELECT COUNT(*) as n FROM concepts WHERE name = ?').get('Orphan');
    assert.equal(before.n, 1);

    db.prepare('DELETE FROM concepts WHERE id NOT IN (SELECT DISTINCT concept_id FROM article_concepts)').run();
    const after = db.prepare('SELECT COUNT(*) as n FROM concepts WHERE name = ?').get('Orphan');
    assert.equal(after.n, 0);
  });

  test('пагинация работает корректно', () => {
    // Очищаем
    db.prepare('DELETE FROM articles').run();
    // Вставляем 5 статей
    for (let i = 1; i <= 5; i++) {
      db.prepare('INSERT INTO articles (title, content) VALUES (?, ?)').run(`Article ${i}`, 'text');
    }
    const page1 = db.prepare('SELECT * FROM articles ORDER BY id LIMIT 3 OFFSET 0').all();
    const page2 = db.prepare('SELECT * FROM articles ORDER BY id LIMIT 3 OFFSET 3').all();
    assert.equal(page1.length, 3);
    assert.equal(page2.length, 2);
  });
});
