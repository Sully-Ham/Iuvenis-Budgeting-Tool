import { useState } from 'react';
import { formatCurrency, daysUntilDue } from '../money.js';

function dueLabel(days) {
  if (days === 0) return { text: 'Due today', urgent: true };
  if (days === 1) return { text: 'Due tomorrow', urgent: true };
  if (days <= 5) return { text: `Due in ${days} days`, urgent: true };
  return { text: `Due in ${days} days`, urgent: false };
}

export default function RemindersSection({ reminders, onAdd, onDelete }) {
  const [form, setForm] = useState({ name: '', amount: '', day_of_month: '', notes: '' });

  async function handleSubmit(e) {
    e.preventDefault();
    const day = parseInt(form.day_of_month, 10);
    if (!form.name.trim() || !Number.isFinite(day) || day < 1 || day > 31) return;

    await onAdd({
      name: form.name.trim(),
      amount: parseFloat(form.amount) || 0,
      day_of_month: day,
      notes: form.notes.trim()
    });
    setForm({ name: '', amount: '', day_of_month: '', notes: '' });
  }

  const sorted = [...reminders].sort((a, b) => daysUntilDue(a.day_of_month) - daysUntilDue(b.day_of_month));

  return (
    <section className="panel">
      <div className="panel-header">
        <span className="eyebrow">05 — Reminders</span>
        <h2>Bills to pay</h2>
      </div>

      <form className="item-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Bill name (e.g. Credit card)"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <div className="input-prefix small">
          <span>$</span>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Amount"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
        </div>
        <input
          type="number"
          min="1"
          max="31"
          placeholder="Day of month (1-31)"
          value={form.day_of_month}
          onChange={(e) => setForm({ ...form, day_of_month: e.target.value })}
          className="day-input"
        />
        <button type="submit" className="btn-primary">Add reminder</button>
      </form>

      <ul className="reminder-list">
        {sorted.length === 0 && <li className="empty">No bill reminders yet — add one above.</li>}
        {sorted.map((reminder) => {
          const days = daysUntilDue(reminder.day_of_month);
          const label = dueLabel(days);
          return (
            <li key={reminder.id} className={`reminder-row ${label.urgent ? 'urgent' : ''}`}>
              <div className="reminder-info">
                <span className="item-name">{reminder.name}</span>
                <span className="item-meta">Day {reminder.day_of_month} of each month</span>
              </div>
              <span className="mono">{formatCurrency(reminder.amount)}</span>
              <span className={`due-badge ${label.urgent ? 'urgent' : ''}`}>{label.text}</span>
              <button type="button" className="btn-ghost" onClick={() => onDelete(reminder.id)}>Remove</button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
