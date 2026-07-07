import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getWeek, patchWeek, getTemplate, putTemplate } from './store.js';

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');

app.use(express.json());
app.use(express.static(PUBLIC_DIR));

const WEEK_RE = /^\d{4}-\d{2}-\d{2}$/;

app.get('/api/template', (_req, res) => {
  res.json(getTemplate());
});

app.put('/api/template', (req, res) => {
  try {
    res.json(putTemplate(req.body));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/week/:weekStart', (req, res) => {
  const { weekStart } = req.params;
  if (!WEEK_RE.test(weekStart)) return res.status(400).json({ error: 'bad weekStart' });
  res.json(getWeek(weekStart));
});

app.patch('/api/week/:weekStart', (req, res) => {
  const { weekStart } = req.params;
  if (!WEEK_RE.test(weekStart)) return res.status(400).json({ error: 'bad weekStart' });
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ error: 'bad body' });
  }
  res.json(patchWeek(weekStart, req.body));
});

app.listen(PORT, () => {
  console.log(`family-planner listening on http://localhost:${PORT}`);
});
