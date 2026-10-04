import express from 'express';
import cors from 'cors';
import { db } from './db';
import { z } from 'zod';

const app = express();

app.use(cors());          
app.use(express.json());  

const SERVICES = ['aerial_media', 'mapping_survey', 'training', 'events', 'other'] as const;

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

const port = 4000;
app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});