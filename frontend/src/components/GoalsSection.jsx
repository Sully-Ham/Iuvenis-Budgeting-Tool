import { useState } from 'react';
import { formatCurrency } from '../money.js';

export default function GoalsSection({ goals, onAdd, onContribute, onDelete }) {
  const [form, setForm] = useState({ name: '', target_amount: '' });
  const [contributions, setContributions] = useState({});

  async function handleSubmit(e) {
    e.preventDefault();
    const target = parseFloat(form.target_amount);
    if (!form.name.trim() || !Number.isFinite(target) || target <= 0) return;
    await onAdd({ name: form.name.trim(), target_amount: target });
    setForm({ name: '', target_amount: '' });
  }

  function handleContribute(id) {
    const amount = parseFloat(contributions[id]);
    if (!Number.isFinite(amount) || amount === 0) return;
    onContribute(id, amount);
    setContributions({ ...contributions, [id]: '' });
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <span className="eyebrow">04 — Goals</span>
        <h2>What you're saving for</h2>
      </div>

      <form className="item-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Goal name (e.g. Spring break trip)"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <div className="input-prefix small">
          <span>$</span>
          <input
            type="number"
            min="0"
            step="1"
            placeholder="Target"
            value={form.target_amount}
            onChange={(e) => setForm({ ...form, target_amount: e.target.value })}
          />
        </div>
        <button type="submit" className="btn-primary">Add goal</button>
      </form>

      <ul className="goal-list">
        {goals.length === 0 && <li className="empty">No goals yet — add something you're saving up for.</li>}
        {goals.map((goal) => {
          const pct = Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100));
          return (
            <li key={goal.id} className="goal-row">
              <div className="goal-top">
                <span className="goal-name">{goal.name}</span>
                <span className="mono">
                  {formatCurrency(goal.current_amount)} / {formatCurrency(goal.target_amount)}
                </span>
              </div>
              <div className="goal-bar-track">
                <div className="goal-bar-fill" style={{ width: `${pct}%` }} />
              </div>
              <div className="goal-actions">
                <input
                  type="number"
                  placeholder="Add $"
                  value={contributions[goal.id] || ''}
                  onChange={(e) => setContributions({ ...contributions, [goal.id]: e.target.value })}
                />
                <button type="button" onClick={() => handleContribute(goal.id)}>Add funds</button>
                <button type="button" className="btn-ghost" onClick={() => onDelete(goal.id)}>Remove</button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
