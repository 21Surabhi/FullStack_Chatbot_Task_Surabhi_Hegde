import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from './db';
import { getReply } from './chatbot';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET is missing. Create server/.env first.');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '10kb' }));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 300 }));
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: { error: 'Too many login attempts, try again later' },
});

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
const chatSchema = z.object({ message: z.string().trim().min(1).max(300) });
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

const listSchema = z.object({
  search: z.string().trim().max(80).optional(),
  status: z.enum(STATUSES).optional(),
  service: z.enum(SERVICES).optional(),
  sort: z.enum(['newest', 'oldest', 'name']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  try {
    jwt.verify(token ?? '', JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
};


app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/chat', (req, res) => {
  const result = chatSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Message is required (max 300 characters)' });
    return;
  }
  res.json(getReply(result.data.message));
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

app.post('/api/auth/login', loginLimiter, (req, res) => {
  const body = loginSchema.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  const admin = db.prepare('SELECT * FROM admins WHERE email = ?').get(body.data.email) as
    | { id: number; password_hash: string }
    | undefined;

 
  if (!admin || !bcrypt.compareSync(body.data.password, admin.password_hash)) {
    res.status(401).json({ error: 'Invalid email or password' });
    return;
  }

  res.json({ token: jwt.sign({ sub: admin.id }, JWT_SECRET, { expiresIn: '8h' }) });
});


app.get('/api/enquiries', requireAdmin, (req, res) => {
  const q = listSchema.safeParse(req.query);
  if (!q.success) {
    res.status(400).json({ error: 'Invalid query options' });
    return;
  }
  const { search, status, service, sort, page, limit } = q.data;

  const where: string[] = [];
  const params: (string | number)[] = [];
  if (search) {
    where.push('(name LIKE ? OR email LIKE ? OR message LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (status) {
    where.push('status = ?');
    params.push(status);
  }
  if (service) {
    where.push('service = ?');
    params.push(service);
  }
  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';

  const orderSql = {
    newest: 'created_at DESC, id DESC',
    oldest: 'created_at ASC, id ASC',
    name: 'name COLLATE NOCASE ASC',
  }[sort];

  const total = (
    db.prepare(`SELECT COUNT(*) AS c FROM enquiries ${whereSql}`).get(...params) as { c: number }
  ).c;

  const items = db
    .prepare(`SELECT * FROM enquiries ${whereSql} ORDER BY ${orderSql} LIMIT ? OFFSET ?`)
    .all(...params, limit, (page - 1) * limit);

  res.json({ items, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
});

app.get('/api/enquiries/:id', requireAdmin, (req, res) => {
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

app.patch('/api/enquiries/:id', requireAdmin, (req, res) => {
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

app.delete('/api/enquiries/:id', requireAdmin, (req, res) => {
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


app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err); // full details only in the server log
  res.status(500).json({ error: 'Something went wrong' }); // generic message for users
});

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => {
  console.log(`API running on http://localhost:${port}`);
});