import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { initDb, getDb } from './database/init.js';
import articlesRouter from './server/routes/articles.js';
import conceptsRouter from './server/routes/concepts.js';
import graphRouter from './server/routes/graph.js';
import lmRouter from './server/routes/lm.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = __dirname;
const isProd = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;

initDb();

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (req, res) => {
  try {
    getDb().prepare('SELECT 1').get();
    res.json({ ok: true, db: true });
  } catch (e) {
    res.status(500).json({ ok: false, db: false, error: e.message });
  }
});

app.use('/api/articles', articlesRouter);
app.use('/api/concepts', conceptsRouter);
app.use('/api/graph', graphRouter);
app.use('/api/lm', lmRouter);

if (isProd) {
  const distPath = path.join(rootDir, 'dist');
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

app.listen(PORT, () => {
  console.log(`Server http://localhost:${PORT}`);
});
