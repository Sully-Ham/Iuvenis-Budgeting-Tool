export const WEEKS_PER_MONTH = 4.345; // average, accounts for months being > 4 weeks
export const WEEKS_PER_YEAR = 52;

// Total tax + withholding percent for a single job (federal + state + FICA).
export function totalTaxPercent(job) {
  return (job.federal_tax_percent || 0) + (job.state_tax_percent || 0) + (job.fica_percent || 0);
}

// Computes both gross (pre-tax) and net (take-home) income for one job,
// accounting for how many months out of the year it's actually worked
// (e.g. a summer-only job with months_per_year = 3).
export function incomeFromJob(job) {
  const weeklyGross = job.hourly_wage * job.hours_per_week;
  const taxPercent = totalTaxPercent(job);
  const weeklyNet = weeklyGross * (1 - taxPercent / 100);

  const monthsActive = job.months_per_year ?? 12;
  const seasonFraction = monthsActive / 12;

  // "Weekly/monthly while active" describe pay during the weeks actually
  // worked. "Yearly" and the averaged monthly figure account for the fact
  // that the job isn't worked all year if months_per_year < 12.
  const yearlyGross = weeklyGross * WEEKS_PER_YEAR * seasonFraction;
  const yearlyNet = weeklyNet * WEEKS_PER_YEAR * seasonFraction;

  return {
    weeklyGross,
    weeklyNet,
    monthlyWhileActiveGross: weeklyGross * WEEKS_PER_MONTH,
    monthlyWhileActiveNet: weeklyNet * WEEKS_PER_MONTH,
    monthlyAvgGross: yearlyGross / 12,
    monthlyAvgNet: yearlyNet / 12,
    yearlyGross,
    yearlyNet,
    taxPercent
  };
}

// Sums net (take-home) income across every job a person works, since
// students often juggle more than one job — and jobs may be seasonal.
export function incomeFromJobs(jobs) {
  return jobs.reduce(
    (totals, job) => {
      const j = incomeFromJob(job);
      return {
        weeklyGross: totals.weeklyGross + j.weeklyGross,
        weeklyNet: totals.weeklyNet + j.weeklyNet,
        monthlyGross: totals.monthlyGross + j.monthlyAvgGross,
        monthlyNet: totals.monthlyNet + j.monthlyAvgNet,
        yearlyGross: totals.yearlyGross + j.yearlyGross,
        yearlyNet: totals.yearlyNet + j.yearlyNet
      };
    },
    { weeklyGross: 0, weeklyNet: 0, monthlyGross: 0, monthlyNet: 0, yearlyGross: 0, yearlyNet: 0 }
  );
}

// Normalize any item's amount to a monthly figure so items of different
// frequencies (weekly/monthly/yearly/one-time) can be compared on one budget.
// A one-time purchase counts fully against the current month only.
export function toMonthly(amount, frequency) {
  switch (frequency) {
    case 'weekly':
      return amount * WEEKS_PER_MONTH;
    case 'yearly':
      return amount / 12;
    case 'one-time':
    case 'monthly':
    default:
      return amount;
  }
}

// Given a day-of-month (1-31), return how many days away the next occurrence
// is (0 = due today, negative never returned - it rolls to next month).
export function daysUntilDue(dayOfMonth) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let due = new Date(now.getFullYear(), now.getMonth(), dayOfMonth);
  if (due < today) {
    due = new Date(now.getFullYear(), now.getMonth() + 1, dayOfMonth);
  }

  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((due - today) / msPerDay);
}

export function formatCurrency(value) {
  const n = Number.isFinite(value) ? value : 0;
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
  });
}
