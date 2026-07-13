import { useState } from 'react';
import { formatCurrency, incomeFromJobs, incomeFromJob, totalTaxPercent } from '../money.js';

const EMPTY_FORM = {
  name: '',
  hourly_wage: '',
  hours_per_week: '',
  federal_tax_percent: '10',
  state_tax_percent: '0',
  fica_percent: '7.65',
  months_per_year: '12'
};

export default function JobsSection({ jobs, onAdd, onUpdate, onDelete }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const totals = incomeFromJobs(jobs);

  function startEdit(job) {
    setEditingId(job.id);
    setForm({
      name: job.name,
      hourly_wage: String(job.hourly_wage),
      hours_per_week: String(job.hours_per_week),
      federal_tax_percent: String(job.federal_tax_percent),
      state_tax_percent: String(job.state_tax_percent),
      fica_percent: String(job.fica_percent),
      months_per_year: String(job.months_per_year)
    });
    setShowAdvanced(true);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const wage = parseFloat(form.hourly_wage);
    const hours = parseFloat(form.hours_per_week);
    const months = parseInt(form.months_per_year, 10);
    if (!form.name.trim() || !Number.isFinite(wage) || !Number.isFinite(hours)) return;
    if (!Number.isInteger(months) || months < 1 || months > 12) return;

    const payload = {
      name: form.name.trim(),
      hourly_wage: wage,
      hours_per_week: hours,
      federal_tax_percent: parseFloat(form.federal_tax_percent) || 0,
      state_tax_percent: parseFloat(form.state_tax_percent) || 0,
      fica_percent: parseFloat(form.fica_percent) || 0,
      months_per_year: months
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
        <span className="eyebrow">01 — Pay</span>
        <h2>What you make</h2>
      </div>

      <form className="item-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Job name (e.g. Campus Dining)"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <div className="input-prefix small">
          <span>$</span>
          <input
            type="number"
            min="0"
            step="0.25"
            placeholder="Hourly wage"
            value={form.hourly_wage}
            onChange={(e) => setForm({ ...form, hourly_wage: e.target.value })}
          />
        </div>
        <input
          type="number"
          min="0"
          step="1"
          placeholder="Hours/week"
          value={form.hours_per_week}
          onChange={(e) => setForm({ ...form, hours_per_week: e.target.value })}
          className="day-input"
        />
        <button type="submit" className="btn-primary">{editingId ? 'Save' : 'Add job'}</button>
        {editingId && (
          <button type="button" className="btn-ghost" onClick={cancelEdit}>Cancel</button>
        )}

        <button
          type="button"
          className="auth-switch advanced-toggle"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          {showAdvanced ? 'Hide' : 'Show'} taxes &amp; work period
        </button>

        {showAdvanced && (
          <div className="advanced-fields">
            <label className="field">
              <span>Federal tax %</span>
              <input
                type="number" min="0" max="100" step="0.5"
                value={form.federal_tax_percent}
                onChange={(e) => setForm({ ...form, federal_tax_percent: e.target.value })}
              />
            </label>
            <label className="field">
              <span>State tax %</span>
              <input
                type="number" min="0" max="100" step="0.5"
                value={form.state_tax_percent}
                onChange={(e) => setForm({ ...form, state_tax_percent: e.target.value })}
              />
            </label>
            <label className="field">
              <span>FICA % (Social Security + Medicare)</span>
              <input
                type="number" min="0" max="100" step="0.05"
                value={form.fica_percent}
                onChange={(e) => setForm({ ...form, fica_percent: e.target.value })}
              />
            </label>
            <label className="field">
              <span>Months worked per year</span>
              <input
                type="number" min="1" max="12" step="1"
                value={form.months_per_year}
                onChange={(e) => setForm({ ...form, months_per_year: e.target.value })}
              />
            </label>
          </div>
        )}
      </form>

      <ul className="item-list">
        {jobs.length === 0 && <li className="empty">No jobs yet — add each one you work above.</li>}
        {jobs.map((job) => {
          const j = incomeFromJob(job);
          const seasonal = job.months_per_year < 12;
          return (
            <li key={job.id} className="item-row">
              <div className="item-info">
                <span className="item-name">{job.name}</span>
                <span className="item-meta">
                  {formatCurrency(job.hourly_wage)}/hr · {job.hours_per_week} hrs/week · {totalTaxPercent(job).toFixed(1)}% withheld
                  {seasonal && <span className="tag-one-time">{job.months_per_year} MO/YR</span>}
                </span>
              </div>
              <span className="mono item-amount">{formatCurrency(j.weeklyNet)}/wk net</span>
              <div className="item-actions">
                <button type="button" onClick={() => startEdit(job)} aria-label={`Edit ${job.name}`}>Edit</button>
                <button type="button" onClick={() => onDelete(job.id)} aria-label={`Delete ${job.name}`}>Delete</button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="income-breakdown">
        <div className="income-stat">
          <span className="income-label">Weekly (while working)</span>
          <span className="income-value">{formatCurrency(totals.weeklyNet)}</span>
          <span className="income-sub">{formatCurrency(totals.weeklyGross)} before taxes</span>
        </div>
        <div className="income-stat">
          <span className="income-label">Monthly (yearly avg)</span>
          <span className="income-value">{formatCurrency(totals.monthlyNet)}</span>
          <span className="income-sub">{formatCurrency(totals.monthlyGross)} before taxes</span>
        </div>
        <div className="income-stat">
          <span className="income-label">Yearly</span>
          <span className="income-value">{formatCurrency(totals.yearlyNet)}</span>
          <span className="income-sub">{formatCurrency(totals.yearlyGross)} before taxes</span>
        </div>
      </div>
    </section>
  );
}
