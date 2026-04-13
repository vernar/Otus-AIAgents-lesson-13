import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { extractJson, buildPrompt } from '../server/lm/analyzer.js';

describe('extractJson', () => {
  test('парсит чистый JSON', () => {
    const raw = JSON.stringify({ concepts: ['LLM'], tools: [], persons: [], orgs: [], summary: 'Тест', sentiment: 'positive' });
    const result = extractJson(raw);
    assert.deepEqual(result.concepts, ['LLM']);
    assert.equal(result.sentiment, 'positive');
  });

  test('извлекает JSON из текста с markdown-обёрткой', () => {
    const raw = 'Вот результат:\n```json\n{"concepts":["AI"],"tools":[],"persons":[],"orgs":[],"summary":"S","sentiment":"neutral"}\n```';
    const result = extractJson(raw);
    assert.deepEqual(result.concepts, ['AI']);
  });

  test('выбрасывает ошибку при невалидном вводе', () => {
    assert.throws(() => extractJson('просто текст без JSON'), /распарсить/);
  });
});

describe('buildPrompt', () => {
  test('возвращает массив из двух сообщений', () => {
    const msgs = buildPrompt('Заголовок', 'Текст статьи');
    assert.equal(msgs.length, 2);
    assert.equal(msgs[0].role, 'system');
    assert.equal(msgs[1].role, 'user');
  });

  test('включает заголовок и текст в user-сообщение', () => {
    const msgs = buildPrompt('GPT-4', 'Текст про GPT-4');
    assert.ok(msgs[1].content.includes('GPT-4'));
    assert.ok(msgs[1].content.includes('Текст про GPT-4'));
  });

  test('обрезает текст до 4000 символов', () => {
    const longText = 'x'.repeat(8000);
    const msgs = buildPrompt('Title', longText);
    assert.ok(!msgs[1].content.includes('x'.repeat(4001)));
  });
});
