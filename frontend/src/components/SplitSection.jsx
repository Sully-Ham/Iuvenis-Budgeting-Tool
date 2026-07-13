import { formatCurrency, incomeFromJobs } from '../money.js';

export default function SplitSection({ jobs, settings, onChange }) {
  const totals = incomeFromJobs(jobs);
  const savePercent = settings.save_percent;
  const spendPercent = 100 - savePercent;

  const saveMonthly = totals.monthlyNet * (savePercent / 100);
  const spendMonthly = totals.monthlyNet * (spendPercent / 100);

  return (
    <section className="panel">
      <div className="panel-header">
        <span className="eyebrow">02 — The split</span>
        <h2>Save vs. spend</h2>
      </div>

      <label className="field">
        <span>Percent to save: {savePercent}%</span>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={savePercent}
          onChange={(e) => onChange({ ...settings, save_percent: parseFloat(e.target.value) })}
          className="slider"
        />
      </label>

      <div className="receipt">
        <div className="receipt-row">
          <span>Monthly take-home pay (avg, all jobs)</span>
          <span className="mono">{formatCurrency(totals.monthlyNet)}</span>
        </div>
        <div className="receipt-divider" />
        <div className="receipt-row accent-save">
          <span>Save ({savePercent}%)</span>
          <span className="mono">{formatCurrency(saveMonthly)}</span>
        </div>
        <div className="receipt-row accent-spend">
          <span>Spend ({spendPercent}%)</span>
          <span className="mono">{formatCurrency(spendMonthly)}</span>
        </div>
      </div>
    </section>
  );
}
