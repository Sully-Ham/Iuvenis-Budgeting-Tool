import pg from 'pg';

const { Pool } = pg;

// DATABASE_URL comes from Supabase (Project Settings -> Database -> Connection string).
// Supabase requires SSL; rejectUnauthorized:false is standard for their managed certs.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

// Creates every table if it doesn't already exist. Safe to run on every boot.
export async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  // One settings row per user (the savings split). Wages live in `jobs`.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS settings (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      save_percent REAL NOT NULL DEFAULT 20
    );
  `);

  // Jobs — a person can work several at once (campus job, retail, tutoring...).
  await pool.query(`
    CREATE TABLE IF NOT EXISTS jobs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      hourly_wage REAL NOT NULL DEFAULT 0,
      hours_per_week REAL NOT NULL DEFAULT 0,
      federal_tax_percent REAL NOT NULL DEFAULT 10,
      state_tax_percent REAL NOT NULL DEFAULT 0,
      fica_percent REAL NOT NULL DEFAULT 7.65,
      months_per_year INTEGER NOT NULL DEFAULT 12,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  // Safe to run even if the table already existed before these columns did —
  // IF NOT EXISTS means existing rows and data are untouched, new columns
  // just get the default value.
  await pool.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS federal_tax_percent REAL NOT NULL DEFAULT 10;`);
  await pool.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS state_tax_percent REAL NOT NULL DEFAULT 0;`);
  await pool.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS fica_percent REAL NOT NULL DEFAULT 7.65;`);
  await pool.query(`ALTER TABLE jobs ADD COLUMN IF NOT EXISTS months_per_year INTEGER NOT NULL DEFAULT 12;`);

  // Planned spending items (rent, groceries, subscriptions, textbooks, etc).
  // `options` is a native JSONB array of { store, price } price-comparison
  // entries; when present, `amount` is kept in sync as the cheapest option.
  await pool.query(`
    CREATE TABLE IF NOT EXISTS items (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'General',
      amount REAL NOT NULL,
      frequency TEXT NOT NULL DEFAULT 'monthly',
      options JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  // Savings goals (spring break trip, new laptop, emergency fund, etc).
  await pool.query(`
    CREATE TABLE IF NOT EXISTS goals (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      target_amount REAL NOT NULL,
      current_amount REAL NOT NULL DEFAULT 0,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  // Recurring bill reminders (credit card due date, rent, subscriptions).
  await pool.query(`
    CREATE TABLE IF NOT EXISTS reminders (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      day_of_month INTEGER NOT NULL,
      notes TEXT DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

export default pool;
