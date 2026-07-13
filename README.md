# Iuvenis Budgeting Tool

A full-stack budgeting app built for college life: create your own account,
track income from multiple jobs, split it into savings vs. spending, plan
out expenses (including one-time purchases and price comparisons across
stores), set savings goals, and get reminders for upcoming bills. Each
person's data is private to their own account, and it's stored in a real
hosted database so it persists over time.

**Stack:** React (Vite) frontend · Node.js/Express REST API · PostgreSQL
database (hosted free on Supabase) · JWT-based authentication with bcrypt
password hashing

---

## Project structure

```
budget-app/
├── backend/          Express API + Postgres connection
│   ├── server.js      Route definitions
│   ├── db.js          Database schema & connection pool
│   ├── auth.js        Password hashing + JWT sign/verify + auth middleware
│   ├── .env.example   Template for your local environment variables
│   └── package.json
└── frontend/          React app (Vite)
    ├── src/
    │   ├── App.jsx
    │   ├── api.js              API client (attaches auth token to requests)
    │   ├── money.js            Wage/budget math helpers
    │   └── components/
    │       ├── AuthScreen.jsx        Login / sign up
    │       ├── JobsSection.jsx       Multiple jobs & total income
    │       ├── SplitSection.jsx      Save vs. spend split
    │       ├── SpendingItems.jsx     Planned expenses + price comparison
    │       ├── GoalsSection.jsx      Savings goals with progress bars
    │       └── RemindersSection.jsx  Bill due-date reminders
    └── package.json
```

## One-time setup: create your free Supabase database

1. Go to [supabase.com](https://supabase.com) and sign up (free, no credit
   card required).
2. Create a new project. Pick any name and a strong database password —
   **save that password somewhere**, you'll need it in a second.
3. Once the project is ready, go to **Project Settings → Database →
   Connection string**, and copy the **URI** version. It looks like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```
4. Replace `[YOUR-PASSWORD]` in that string with the actual password from
   step 2.

You now have a `DATABASE_URL`. The app will automatically create all the
tables it needs the first time it connects — no manual SQL required.

## Running locally

You'll need [Node.js](https://nodejs.org) 18+ installed.

### 1. Configure the backend

```bash
cd backend
cp .env.example .env
```
Open the new `.env` file and paste in your real `DATABASE_URL` from above.
Also set `JWT_SECRET` to any long random string (this signs login sessions —
you can generate one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).

### 2. Start the backend

```bash
npm install
npm start
```

This starts the API at `http://localhost:4000` and connects to your Supabase
database, creating all the necessary tables automatically on first run.

### 3. Start the frontend (in a second terminal)

```bash
cd frontend
npm install
npm run dev
```

This starts the app at `http://localhost:5173`. The Vite dev server proxies
`/api` requests to the backend, so both need to be running.

Open `http://localhost:5173` in your browser — you'll land on a login/sign-up
screen. Create an account and you're in.

---

## How the features work

- **Accounts**: sign up with an email and password. Passwords are hashed
  with bcrypt before being stored — never saved in plain text. Logging in
  returns a token (JWT) that's saved in your browser and sent with every
  request so the server knows who you are. Every job, item, goal, and
  reminder belongs to exactly one account, and it's all stored in Postgres,
  so it's there whenever you come back — including after code deploys.
- **Jobs**: add each job you work (name, hourly wage, hours/week), plus
  optional federal tax %, state tax %, and FICA % (Social Security +
  Medicare, defaults to the standard 7.65%) to estimate take-home pay. If a
  job isn't year-round (a summer job, a seasonal gig), set "months worked
  per year" and the app will average its income across the full year for
  monthly budgeting, while still showing what you actually earn per week
  while it's active. All budget calculations use net (after-tax) income —
  what actually hits your bank account — while still showing gross figures
  for comparison.

  **Note:** these are flat-percentage estimates for budgeting purposes, not
  precise payroll withholding — actual tax brackets, filing status, and
  deductions affect real take-home pay. Treat the numbers as a helpful
  approximation, not tax advice.
- **Save/Spend split**: a single slider (0–100%) splits total monthly income
  into a savings amount and a spending budget.
- **Spending items**: each item has an amount and a frequency (weekly/
  monthly/yearly/one-time). All items are normalized to a monthly figure so
  they can be compared against your monthly spending budget, showing how
  much room is left (or how far over you are). One-time items are tagged and
  count fully against the current month.
- **Price comparison**: when adding or editing an item, type something like
  `Amazon: 12.99, Target: 14.50` in the compare-prices field. The app stores
  every option, automatically uses the cheapest as the item's cost, and shows
  you how much you'd save by picking the cheapest store.
- **Savings goals**: set a name and target amount, then add funds toward it
  over time. A progress bar shows how close you are.
- **Bill reminders**: set a day of the month a bill is due (credit card,
  rent, subscriptions). The app calculates the next occurrence and flags
  anything due within 5 days.

---

## Deploying it live (free)

1. **Backend → [Render](https://render.com) (free tier)**
   - Push this repo to GitHub.
   - On Render: New → Web Service → connect the repo → set root directory to
     `backend` → build command `npm install` → start command `npm start`.
   - Add two environment variables:
     - `DATABASE_URL` → your Supabase connection string
     - `JWT_SECRET` → any long random string (keep it secret; use a
       different value than whatever you used locally isn't required, but
       it must be set)
   - Deploy. Since the database now lives on Supabase, not on Render's disk,
     your data survives redeploys and restarts.

2. **Frontend → [Vercel](https://vercel.com) (free tier)**
   - New Project → import the repo → set root directory to `frontend`.
   - Add environment variable `VITE_API_URL` set to your Render backend URL
     plus `/api`, e.g. `https://your-app.onrender.com/api`.
   - Deploy.

Both platforms have generous free tiers that are enough for a resume demo —
and now with Supabase in the mix, the data itself sticks around for good.

---

## Resume bullet ideas

- Built a full-stack budgeting app (React, Express, PostgreSQL) with
  JWT-based authentication, bcrypt password hashing, and per-user data
  isolation across a relational schema.
- Designed a REST API with CRUD endpoints for jobs, expenses, savings goals,
  and bill reminders, with client-side and server-side validation, deployed
  on Render and Vercel with a managed Postgres database on Supabase.
