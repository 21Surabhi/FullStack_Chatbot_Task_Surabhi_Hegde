import express from 'express';
import cors from 'cors';
import { db } from './db';

const app = express();

app.use(cors());          
app.use(express.json());  

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});


app.post('/api/enquiries', (req, res) => {
  const { name, email, phone, service, message } = req.body;

  const info = db
    .prepare(
      'INSERT INTO enquiries (name, email, phone, service, message) VALUES (?, ?, ?, ?, ?)'
    )
    .run(name, email, phone ?? null, service, message);

  res.status(201).json({ id: info.lastInsertRowid });
});

app.get('/api/enquiries', (_req, res) => {
  const rows = db.prepare('SELECT * FROM enquiries ORDER BY id DESC').all();
  res.json(rows);
});

const port = 4000;
app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});