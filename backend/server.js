import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pool, { initSchema } from './db.js';
import { hashPassword, verifyPassword, signToken, requireAuth } from './auth.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// ---------- Auth ----------

app.post('/api/auth/signup', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password || password.length < 6) {
    return res.status(400).json({ error: 'Email and a password of at least 6 characters are required' });
  }

  try {
    const passwordHash = hashPassword(password);
    const { rows } = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [email.toLowerCase(), passwordHash]
    );
    const user = rows[0];

    await pool.query('INSERT INTO settings (user_id, save_percent) VALUES ($1, 20)', [user.id]);

    const token = signToken(user.id);
    res.status(201).json({ token, user });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'An account with that email already exists' });
    }
    console.error(err);
    res.status(500).json({ error: 'Something went wrong creating your account' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
  const user = rows[0];
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Incorrect email or password' });
  }

  const token = signToken(user.id);
  res.json({ token, user: { id: user.id, email: user.email } });
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  const { rows } = await pool.query('SELECT id, email FROM users WHERE id = $1', [req.userId]);
  if (!rows[0]) return res.status(404).json({ error: 'User not found' });
  res.json({ user: rows[0] });
});

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Every route below this line requires a valid login.
app.use('/api', requireAuth);

// ---------- Settings (savings split only — wages live in /api/jobs) ----------

app.get('/api/settings', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM settings WHERE user_id = $1', [req.userId]);
  res.json(rows[0]);
});

app.put('/api/settings', async (req, res) => {
  const { save_percent } = req.body;
  if (typeof save_percent !== 'number' || save_percent < 0 || save_percent > 100) {
    return res.status(400).json({ error: 'save_percent must be a number between 0 and 100' });
  }

  const { rows } = await pool.query(
    'UPDATE settings SET save_percent = $1 WHERE user_id = $2 RETURNING *',
    [save_percent, req.userId]
  );
  res.json(rows[0]);
});

// ---------- Jobs ----------

app.get('/api/jobs', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM jobs WHERE user_id = $1 ORDER BY created_at ASC', [req.userId]);
  res.json(rows);
});

app.post('/api/jobs', async (req, res) => {
  const {
    name,
    hourly_wage,
    hours_per_week,
    federal_tax_percent,
    state_tax_percent,
    fica_percent,
    months_per_year
  } = req.body;

  if (!name || typeof hourly_wage !== 'number' || typeof hours_per_week !== 'number') {
    return res.status(400).json({ error: 'name, hourly_wage, and hours_per_week are required' });
  }
  const months = Number.isInteger(months_per_year) ? months_per_year : 12;
  if (months < 1 || months > 12) {
    return res.status(400).json({ error: 'months_per_year must be between 1 and 12' });
  }

  const { rows } = await pool.query(
    `INSERT INTO jobs
      (user_id, name, hourly_wage, hours_per_week, federal_tax_percent, state_tax_percent, fica_percent, months_per_year)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [
      req.userId,
      name,
      hourly_wage,
      hours_per_week,
      typeof federal_tax_percent === 'number' ? federal_tax_percent : 10,
      typeof state_tax_percent === 'number' ? state_tax_percent : 0,
      typeof fica_percent === 'number' ? fica_percent : 7.65,
      months
    ]
  );
  res.status(201).json(rows[0]);
});

app.put('/api/jobs/:id', async (req, res) => {
  const { id } = req.params;
  const {
    name,
    hourly_wage,
    hours_per_week,
    federal_tax_percent,
    state_tax_percent,
    fica_percent,
    months_per_year
  } = req.body;

  const existing = await pool.query('SELECT * FROM jobs WHERE id = $1 AND user_id = $2', [id, req.userId]);
  if (!existing.rows[0]) return res.status(404).json({ error: 'Job not found' });
  const job = existing.rows[0];

  const months = Number.isInteger(months_per_year) ? months_per_year : job.months_per_year;
  if (months < 1 || months > 12) {
    return res.status(400).json({ error: 'months_per_year must be between 1 and 12' });
  }

  const { rows } = await pool.query(
    `UPDATE jobs SET
      name = $1, hourly_wage = $2, hours_per_week = $3,
      federal_tax_percent = $4, state_tax_percent = $5, fica_percent = $6, months_per_year = $7
     WHERE id = $8 RETURNING *`,
    [
      name ?? job.name,
      typeof hourly_wage === 'number' ? hourly_wage : job.hourly_wage,
      typeof hours_per_week === 'number' ? hours_per_week : job.hours_per_week,
      typeof federal_tax_percent === 'number' ? federal_tax_percent : job.federal_tax_percent,
      typeof state_tax_percent === 'number' ? state_tax_percent : job.state_tax_percent,
      typeof fica_percent === 'number' ? fica_percent : job.fica_percent,
      months,
      id
    ]
  );
  res.json(rows[0]);
});

app.delete('/api/jobs/:id', async (req, res) => {
  const { id } = req.params;
  const existing = await pool.query('SELECT id FROM jobs WHERE id = $1 AND user_id = $2', [id, req.userId]);
  if (!existing.rows[0]) return res.status(404).json({ error: 'Job not found' });

  await pool.query('DELETE FROM jobs WHERE id = $1', [id]);
  res.status(204).send();
});

// ---------- Spending items ----------

function resolveAmount(amount, options) {
  if (Array.isArray(options) && options.length > 0) {
    const prices = options.map((o) => o.price).filter((p) => typeof p === 'number' && p >= 0);
    if (prices.length > 0) return Math.min(...prices);
  }
  return amount;
}

const VALID_FREQUENCIES = ['weekly', 'monthly', 'yearly', 'one-time'];

app.get('/api/items', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM items WHERE user_id = $1 ORDER BY created_at DESC', [req.userId]);
  res.json(rows.map((r) => ({ ...r, options: r.options || [] })));
});

app.post('/api/items', async (req, res) => {
  const { name, category, amount, frequency, options } = req.body;

  if (!name || (typeof amount !== 'number' && !Array.isArray(options))) {
    return res.status(400).json({ error: 'name is required, and either amount or options must be provided' });
  }
  const freq = VALID_FREQUENCIES.includes(frequency) ? frequency : 'monthly';
  const finalAmount = resolveAmount(amount, options);
  const optionsJson = Array.isArray(options) && options.length > 0 ? JSON.stringify(options) : null;

  const { rows } = await pool.query(
    'INSERT INTO items (user_id, name, category, amount, frequency, options) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
    [req.userId, name, category || 'General', finalAmount, freq, optionsJson]
  );
  const created = rows[0];
  res.status(201).json({ ...created, options: created.options || [] });
});

app.put('/api/items/:id', async (req, res) => {
  const { id } = req.params;
  const { name, category, amount, frequency, options } = req.body;

  const existing = await pool.query('SELECT * FROM items WHERE id = $1 AND user_id = $2', [id, req.userId]);
  if (!existing.rows[0]) return res.status(404).json({ error: 'Item not found' });
  const item = existing.rows[0];

  const nextOptions = options !== undefined ? options : (item.options || []);
  const nextAmount = resolveAmount(typeof amount === 'number' ? amount : item.amount, nextOptions);
  const optionsJson = Array.isArray(nextOptions) && nextOptions.length > 0 ? JSON.stringify(nextOptions) : null;

  const { rows } = await pool.query(
    'UPDATE items SET name = $1, category = $2, amount = $3, frequency = $4, options = $5 WHERE id = $6 RETURNING *',
    [
      name ?? item.name,
      category ?? item.category,
      nextAmount,
      VALID_FREQUENCIES.includes(frequency) ? frequency : item.frequency,
      optionsJson,
      id
    ]
  );
  const updated = rows[0];
  res.json({ ...updated, options: updated.options || [] });
});

app.delete('/api/items/:id', async (req, res) => {
  const { id } = req.params;
  const existing = await pool.query('SELECT id FROM items WHERE id = $1 AND user_id = $2', [id, req.userId]);
  if (!existing.rows[0]) return res.status(404).json({ error: 'Item not found' });

  await pool.query('DELETE FROM items WHERE id = $1', [id]);
  res.status(204).send();
});

// ---------- Savings goals ----------

app.get('/api/goals', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM goals WHERE user_id = $1 ORDER BY created_at DESC', [req.userId]);
  res.json(rows);
});

app.post('/api/goals', async (req, res) => {
  const { name, target_amount } = req.body;
  if (!name || typeof target_amount !== 'number' || target_amount <= 0) {
    return res.status(400).json({ error: 'name (string) and target_amount (positive number) are required' });
  }

  const { rows } = await pool.query(
    'INSERT INTO goals (user_id, name, target_amount, current_amount) VALUES ($1, $2, $3, 0) RETURNING *',
    [req.userId, name, target_amount]
  );
  res.status(201).json(rows[0]);
});

app.put('/api/goals/:id/contribute', async (req, res) => {
  const { id } = req.params;
  const { delta } = req.body;
  if (typeof delta !== 'number') {
    return res.status(400).json({ error: 'delta (number) is required' });
  }

  const existing = await pool.query('SELECT * FROM goals WHERE id = $1 AND user_id = $2', [id, req.userId]);
  if (!existing.rows[0]) return res.status(404).json({ error: 'Goal not found' });
  const goal = existing.rows[0];

  const nextAmount = Math.max(0, goal.current_amount + delta);
  const { rows } = await pool.query(
    'UPDATE goals SET current_amount = $1 WHERE id = $2 RETURNING *',
    [nextAmount, id]
  );
  res.json(rows[0]);
});

app.delete('/api/goals/:id', async (req, res) => {
  const { id } = req.params;
  const existing = await pool.query('SELECT id FROM goals WHERE id = $1 AND user_id = $2', [id, req.userId]);
  if (!existing.rows[0]) return res.status(404).json({ error: 'Goal not found' });

  await pool.query('DELETE FROM goals WHERE id = $1', [id]);
  res.status(204).send();
});

// ---------- Bill reminders ----------

app.get('/api/reminders', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM reminders WHERE user_id = $1 ORDER BY day_of_month ASC', [req.userId]);
  res.json(rows);
});

app.post('/api/reminders', async (req, res) => {
  const { name, amount, day_of_month, notes } = req.body;
  if (!name || typeof day_of_month !== 'number' || day_of_month < 1 || day_of_month > 31) {
    return res.status(400).json({ error: 'name (string) and day_of_month (1-31) are required' });
  }

  const { rows } = await pool.query(
    'INSERT INTO reminders (user_id, name, amount, day_of_month, notes) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [req.userId, name, typeof amount === 'number' ? amount : 0, day_of_month, notes || '']
  );
  res.status(201).json(rows[0]);
});

app.delete('/api/reminders/:id', async (req, res) => {
  const { id } = req.params;
  const existing = await pool.query('SELECT id FROM reminders WHERE id = $1 AND user_id = $2', [id, req.userId]);
  if (!existing.rows[0]) return res.status(404).json({ error: 'Reminder not found' });

  await pool.query('DELETE FROM reminders WHERE id = $1', [id]);
  res.status(204).send();
});

// Set up the database tables (if they don't already exist), then start listening.
initSchema()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Budget app API running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database schema:', err);
    process.exit(1);
  });
