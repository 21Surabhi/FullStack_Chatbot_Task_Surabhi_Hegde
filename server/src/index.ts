import express from 'express';
import cors from 'cors';
import { db } from './db';
import { z } from 'zod';

const app = express();

app.use(cors());
app.use(express.json());

const SERVICES = ['aerial_media', 'mapping_survey', 'training', 'events', 'other'] as const;
const STATUSES = ['new', 'contacted', 'closed'] as const;

const enquirySchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email: z.string().trim().email('Enter a valid email').max(120),
  phone: z
    .string()
    .trim()
    .regex(/^[+\d][\d\s-]{6,15}$/, 'Enter a valid phone number')
    .optional()
    .or(z.literal('')),
  service: z.enum(SERVICES),
  message: z.string().trim().min(10, 'Message must be at least 10 characters').max(1000),
});

const idSchema = z.coerce.number().int().positive();
const statusSchema = z.object({ status: z.enum(STATUSES) });

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});


app.post('/api/enquiries', (req, res) => {
  const result = enquirySchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      error: 'Validation failed',
      fields: result.error.flatten().fieldErrors,
    });
    return;
  }

  const { name, email, phone, service, message } = result.data;

  const info = db
    .prepare(
      'INSERT INTO enquiries (name, email, phone, service, message) VALUES (?, ?, ?, ?, ?)'
    )
    .run(name, email, phone || null, service, message);

  res.status(201).json({ id: info.lastInsertRowid });
});


app.get('/api/enquiries', (_req, res) => {
  const rows = db.prepare('SELECT * FROM enquiries ORDER BY id DESC').all();
  res.json(rows);
});


app.get('/api/enquiries/:id', (req, res) => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }

  const row = db.prepare('SELECT * FROM enquiries WHERE id = ?').get(id.data);
  if (!row) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.json(row);
});


app.patch('/api/enquiries/:id', (req, res) => {
  const id = idSchema.safeParse(req.params.id);
  const body = statusSchema.safeParse(req.body);
  if (!id.success || !body.success) {
    res.status(400).json({ error: 'Invalid id or status' });
    return;
  }

  const info = db
    .prepare('UPDATE enquiries SET status = ? WHERE id = ?')
    .run(body.data.status, id.data);
  if (info.changes === 0) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  res.json(db.prepare('SELECT * FROM enquiries WHERE id = ?').get(id.data));
});


app.delete('/api/enquiries/:id', (req, res) => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }

  const info = db.prepare('DELETE FROM enquiries WHERE id = ?').run(id.data);
  if (info.changes === 0) {
    res.status(404).json({ error: 'Not found' });
    return;
  }
  res.status(204).end();
});

const port = 4000;
app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});