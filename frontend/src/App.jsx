import { useEffect, useState } from 'react';
import { api, setAuthToken } from './api.js';
import { incomeFromJobs } from './money.js';
import AuthScreen from './components/AuthScreen.jsx';
import JobsSection from './components/JobsSection.jsx';
import SplitSection from './components/SplitSection.jsx';
import SpendingItems from './components/SpendingItems.jsx';
import GoalsSection from './components/GoalsSection.jsx';
import RemindersSection from './components/RemindersSection.jsx';

export default function App() {
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);

  const [settings, setSettings] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [items, setItems] = useState([]);
  const [goals, setGoals] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saveTimeout, setSaveTimeout] = useState(null);

  // On first load, see if there's a saved token and try to resume the session.
  useEffect(() => {
    const stored = localStorage.getItem('iuvenis_token');
    if (!stored) {
      setAuthChecked(true);
      return;
    }
    setAuthToken(stored);
    api.me()
      .then(({ user }) => setUser(user))
      .catch(() => {
        localStorage.removeItem('iuvenis_token');
        setAuthToken(null);
      })
      .finally(() => setAuthChecked(true));
  }, []);

  // Once we know who's logged in, load their data.
  useEffect(() => {
    if (!user) return;
    setLoading(true);
    async function load() {
      try {
        const [settingsData, jobsData, itemsData, goalsData, remindersData] = await Promise.all([
          api.getSettings(),
          api.getJobs(),
          api.getItems(),
          api.getGoals(),
          api.getReminders()
        ]);
        setSettings(settingsData);
        setJobs(jobsData);
        setItems(itemsData);
        setGoals(goalsData);
        setReminders(remindersData);
      } catch (err) {
        setError('Could not load your data. Try logging in again.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  function handleAuthenticated(authedUser) {
    setUser(authedUser);
  }

  function handleLogout() {
    localStorage.removeItem('iuvenis_token');
    setAuthToken(null);
    setUser(null);
    setSettings(null);
    setJobs([]);
    setItems([]);
    setGoals([]);
    setReminders([]);
  }

  function handleSettingsChange(next) {
    setSettings(next);
    if (saveTimeout) clearTimeout(saveTimeout);
    const timeout = setTimeout(() => {
      api.updateSettings(next).catch(() => setError('Failed to save settings.'));
    }, 400);
    setSaveTimeout(timeout);
  }

  async function handleAddJob(job) {
    const created = await api.addJob(job);
    setJobs((prev) => [...prev, created]);
  }
  async function handleUpdateJob(id, job) {
    const updated = await api.updateJob(id, job);
    setJobs((prev) => prev.map((j) => (j.id === id ? updated : j)));
  }
  async function handleDeleteJob(id) {
    await api.deleteJob(id);
    setJobs((prev) => prev.filter((j) => j.id !== id));
  }

  async function handleAddItem(item) {
    const created = await api.addItem(item);
    setItems((prev) => [created, ...prev]);
  }
  async function handleUpdateItem(id, item) {
    const updated = await api.updateItem(id, item);
    setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
  }
  async function handleDeleteItem(id) {
    await api.deleteItem(id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function handleAddGoal(goal) {
    const created = await api.addGoal(goal);
    setGoals((prev) => [created, ...prev]);
  }
  async function handleContributeGoal(id, delta) {
    const updated = await api.contributeToGoal(id, delta);
    setGoals((prev) => prev.map((g) => (g.id === id ? updated : g)));
  }
  async function handleDeleteGoal(id) {
    await api.deleteGoal(id);
    setGoals((prev) => prev.filter((g) => g.id !== id));
  }

  async function handleAddReminder(reminder) {
    const created = await api.addReminder(reminder);
    setReminders((prev) => [...prev, created]);
  }
  async function handleDeleteReminder(id) {
    await api.deleteReminder(id);
    setReminders((prev) => prev.filter((r) => r.id !== id));
  }

  if (!authChecked) {
    return (
      <div className="app-shell centered">
        <p>Loading…</p>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onAuthenticated={handleAuthenticated} />;
  }

  if (loading || !settings) {
    return (
      <div className="app-shell centered">
        <p>Loading your budget…</p>
      </div>
    );
  }

  const income = incomeFromJobs(jobs);
  const spendBudgetMonthly = income.monthlyNet * ((100 - settings.save_percent) / 100);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-top">
          <div>
            <span className="eyebrow">Personal Budget Planner · {user.email}</span>
            <h1>Iuvenis Budgeting </h1>
          </div>
          <button type="button" className="btn-ghost" onClick={handleLogout}>Log out</button>
        </div>
        <p className="subtitle">From every paycheck to what's left to spend — built for college life.</p>
      </header>

      {error && <div className="banner-error">{error}</div>}

      <main className="layout">
        <JobsSection jobs={jobs} onAdd={handleAddJob} onUpdate={handleUpdateJob} onDelete={handleDeleteJob} />
        <SplitSection jobs={jobs} settings={settings} onChange={handleSettingsChange} />
        <SpendingItems
          items={items}
          spendBudgetMonthly={spendBudgetMonthly}
          onAdd={handleAddItem}
          onUpdate={handleUpdateItem}
          onDelete={handleDeleteItem}
        />
        <GoalsSection goals={goals} onAdd={handleAddGoal} onContribute={handleContributeGoal} onDelete={handleDeleteGoal} />
        <RemindersSection reminders={reminders} onAdd={handleAddReminder} onDelete={handleDeleteReminder} />
      </main>

      <footer className="app-footer">
        <span> An application by Sullivan Gaffney. Built with React, Express &amp; SQLite.</span>
      </footer>
    </div>
  );
}
