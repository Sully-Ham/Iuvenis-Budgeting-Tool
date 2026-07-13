import { useState } from 'react';
import { formatCurrency, toMonthly } from '../money.js';

const EMPTY_FORM = { name: '', category: 'General', amount: '', frequency: 'monthly', optionsText: '' };
const CATEGORIES = ['General', 'Housing', 'Food', 'Textbooks', 'Transport', 'Subscriptions', 'Fun', 'Other'];

// Parses a quick-entry string like "Amazon: 12.99, Target: 14.50" into
// [{ store: 'Amazon', price: 12.99 }, { store: 'Target', price: 14.50 }].
function parseOptions(text) {
  if (!text.trim()) return [];
  return text
    .split(',')
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const [store, priceStr] = chunk.split(':').map((s) => s.trim());
      const price = parseFloat(priceStr);
      return store && Number.isFinite(price) ? { store, price } : null;
    })
    .filter(Boolean);
}

function optionsToText(options) {
  if (!options || options.length === 0) return '';
  return options.map((o) => `${o.store}: ${o.price}`).join(', ');
}

export default function SpendingItems({ items, spendBudgetMonthly, onAdd, onUpdate, onDelete }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);

  const itemsMonthlyTotal = items.reduce((sum, i) => sum + toMonthly(i.amount, i.frequency), 0);
  const remaining = spendBudgetMonthly - itemsMonthlyTotal;
  const isOverBudget = remaining < 0;

  function startEdit(item) {
    setEditingId(item.id);
    setForm({
      name: item.name,
      category: item.category,
      amount: String(item.amount),
      frequency: item.frequency,
      optionsText: optionsToText(item.options)
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const options = parseOptions(form.optionsText);
    const amount = parseFloat(form.amount);

    if (!form.name.trim()) return;
    if (options.length === 0 && (!Number.isFinite(amount) || amount <= 0)) return;

    const payload = {
      name: form.name.trim(),
      category: form.category,
      amount: Number.isFinite(amount) ? amount : 0,
      frequency: form.frequency,
      options
    };

    if (editingId) {
      await onUpdate(editingId, payload);
    } else {
      await onAdd(payload);
    }
    cancelEdit();
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <span className="eyebrow">03 — Line items</span>
        <h2>What you spend on</h2>
      </div>

      <div className={`budget-meter ${isOverBudget ? 'over' : ''}`}>
        <div className="budget-meter-row">
          <span>Planned spend budget (monthly)</span>
          <span className="mono">{formatCurrency(spendBudgetMonthly)}</span>
        </div>
        <div className="budget-meter-row">
          <span>Items total (monthly)</span>
          <span className="mono">{formatCurrency(itemsMonthlyTotal)}</span>
        </div>
        <div className="budget-meter-row strong">
          <span>{isOverBudget ? 'Over budget by' : 'Remaining'}</span>
          <span className="mono">{formatCurrency(Math.abs(remaining))}</span>
        </div>
      </div>

      <form className="item-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Item name (e.g. Rent, Textbook)"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <select
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <div className="input-prefix small">
          <span>$</span>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Amount"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            disabled={parseOptions(form.optionsText).length > 0}
          />
        </div>
        <select
          value={form.frequency}
          onChange={(e) => setForm({ ...form, frequency: e.target.value })}
        >
          <option value="weekly">per week</option>
          <option value="monthly">per month</option>
          <option value="yearly">per year</option>
          <option value="one-time">one-time</option>
        </select>
        <button type="submit" className="btn-primary">
          {editingId ? 'Save' : 'Add item'}
        </button>
        {editingId && (
          <button type="button" className="btn-ghost" onClick={cancelEdit}>
            Cancel
          </button>
        )}

        <input
          type="text"
          className="options-input"
          placeholder="Optional: compare prices — e.g. Amazon: 12.99, Target: 14.50"
          value={form.optionsText}
          onChange={(e) => setForm({ ...form, optionsText: e.target.value })}
        />
      </form>

      <ul className="item-list">
        {items.length === 0 && <li className="empty">No spending items yet — add your first one above.</li>}
        {items.map((item) => {
          const hasOptions = item.options && item.options.length > 1;
          const sorted = hasOptions ? [...item.options].sort((a, b) => a.price - b.price) : [];
          const cheapest = sorted[0];
          const priciest = sorted[sorted.length - 1];
          const savings = hasOptions ? priciest.price - cheapest.price : 0;

          return (
            <li key={item.id} className="item-row-wrap">
              <div className="item-row">
                <div className="item-info">
                  <span className="item-name">{item.name}</span>
                  <span className="item-meta">
                    {item.category} · {item.frequency}
                    {item.frequency === 'one-time' && <span className="tag-one-time">ONE-TIME</span>}
                  </span>
                </div>
                <span className="mono item-amount">{formatCurrency(item.amount)}</span>
                <div className="item-actions">
                  <button type="button" onClick={() => startEdit(item)} aria-label={`Edit ${item.name}`}>Edit</button>
                  <button type="button" onClick={() => onDelete(item.id)} aria-label={`Delete ${item.name}`}>Delete</button>
                </div>
              </div>
              {hasOptions && (
                <div className="price-compare">
                  {sorted.map((opt, i) => (
                    <span key={i} className={`price-chip ${opt.store === cheapest.store && opt.price === cheapest.price ? 'best' : ''}`}>
                      {opt.store}: {formatCurrency(opt.price)}
                    </span>
                  ))}
                  <span className="price-savings">Save {formatCurrency(savings)} by choosing {cheapest.store}</span>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
