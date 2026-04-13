import { Router } from 'express';
import * as cheerio from 'cheerio';
import {
  getAllArticles,
  getArticleById,
  insertArticle,
  updateArticleAnalysis,
  deleteArticle,
} from '../db/articles.js';
import { upsertConcepts, deleteOrphanConcepts } from '../db/concepts.js';
import { analyzeArticle } from '../lm/analyzer.js';

const router = Router();

/* ── GET /api/articles ────────────────────────────────────────── */
router.get('/', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  res.json(getAllArticles({ page, limit }));
});

/* ── GET /api/articles/:id ────────────────────────────────────── */
router.get('/:id', (req, res) => {
  const article = getArticleById(Number(req.params.id));
  if (!article) return res.status(404).json({ error: 'not_found' });
  res.json(article);
});

/* ── POST /api/articles ───────────────────────────────────────── */
router.post('/', async (req, res) => {
  const { url, modelId } = req.body;
  if (!url) return res.status(400).json({ error: 'url required' });

  // 1. Fetch & parse the URL
  let title, content;
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KGNewsBot/1.0)' },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const html = await response.text();
    const $ = cheerio.load(html);
    title = $('meta[property="og:title"]').attr('content')
         || $('meta[name="twitter:title"]').attr('content')
         || $('h1').first().text().trim()
         || $('title').text().trim().split('|')[0].split('/')[0].trim()
         || url;
    $('script, style, nav, header, footer, noscript').remove();
    content = $('body').text().replace(/\s+/g, ' ').trim();
  } catch (e) {
    return res.status(422).json({ error: 'fetch_failed', message: e.message });
  }

  // 2. Save article
  const id = insertArticle({ title, content, source: url });

  // 3. Analyze with LM Studio
  if (!modelId) {
    return res.status(201).json({ ...getArticleById(id), analysis_skipped: true });
  }

  try {
    const extracted = await analyzeArticle({ modelId, title, text: content });
    updateArticleAnalysis(id, extracted);
    upsertConcepts(id, extracted);
  } catch (e) {
    console.error('[LM Studio]', e.message);
    return res.status(201).json({
      ...getArticleById(id),
      analysis_skipped: true,
      lm_error: e.message,
    });
  }

  res.status(201).json(getArticleById(id));
});

/* ── DELETE /api/articles/:id ─────────────────────────────────── */
router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  const result = deleteArticle(id);
  if (result.changes === 0) return res.status(404).json({ error: 'not_found' });
  const orphanedConceptsRemoved = deleteOrphanConcepts();
  res.json({ deleted: result.changes, orphanedConceptsRemoved });
});

/* ── POST /api/articles/:id/analyze ──────────────────────────── */
router.post('/:id/analyze', async (req, res) => {
  const id = Number(req.params.id);
  const article = getArticleById(id);
  if (!article) return res.status(404).json({ error: 'not_found' });

  const { modelId } = req.body;
  if (!modelId) return res.status(400).json({ error: 'modelId required' });

  try {
    const extracted = await analyzeArticle({ modelId, title: article.title, text: article.content });
    updateArticleAnalysis(id, extracted);
    upsertConcepts(id, extracted);
  } catch (e) {
    return res.status(503).json({ error: 'lm_studio_unavailable', message: e.message });
  }

  res.json(getArticleById(id));
});

export default router;
