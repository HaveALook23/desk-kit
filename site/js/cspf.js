import { LEGAL_DATA } from '../data/legal-data.js';
import { roundMoney } from './util.js';

export function cspfBand(cohort, completedYears) {
  const years = Number(completedYears);
  if (!Number.isFinite(years) || years < 0) {
    return { error: '請輸入已完成的無間斷服務年期。' };
  }
  const table = LEGAL_DATA.cspf.schedules[cohort];
  if (!table) return { error: '請選擇適用的供款表。' };
  const band = table.find((row) => years >= row.min && (row.max == null || years < row.max));
  if (!band) return { error: '找不到對應供款率。' };
  return { years, band };
}

/**
 * Official rate lookup + this-month illustration.
 * Not an account balance and not a retirement forecast.
 */
export function lookupCspf({ cohort, completedYears, disciplined, monthlySalary }) {
  const found = cspfBand(cohort, completedYears);
  if (found.error) return found;
  const govRate = found.band.rate;
  const sdscRate = disciplined ? LEGAL_DATA.cspf.sdscRate : 0;
  const salary = Math.max(0, Number(monthlySalary) || 0);
  const govMonthly = salary ? roundMoney(salary * govRate, 0) : null;
  const sdscMonthly = salary && sdscRate ? roundMoney(salary * sdscRate, 0) : sdscRate ? 0 : null;
  const totalMonthly =
    govMonthly == null ? null : roundMoney(govMonthly + (sdscMonthly || 0), 0);
  const gvcLikelyVested = found.years >= LEGAL_DATA.cspf.gvcVestYears;
  return {
    cohort,
    years: found.years,
    bandLabel: found.band.label,
    govRate,
    sdscRate,
    govMonthly,
    sdscMonthly: disciplined ? sdscMonthly : 0,
    totalMonthly,
    gvcLikelyVested,
    lastVerified: LEGAL_DATA.lastVerified,
  };
}

/** Ordinary annuity: end-of-month contributions, optional existing balance. */
export function projectSandbox({ monthlyAmount, years, annualReturnPct, currentBalance }) {
  const pmt = Number(monthlyAmount);
  const y = Number(years);
  const pct = Number(annualReturnPct);
  const bal = Math.max(0, Number(currentBalance) || 0);
  if (!Number.isFinite(pmt) || pmt < 0) return { error: '請輸入每月供款。' };
  if (!Number.isFinite(y) || y <= 0 || y > 50) return { error: '年期須為 0 以上、50 年或以下。' };
  if (!Number.isFinite(pct) || pct < -20 || pct > 20) {
    return { error: '假設年回報請介乎 -20% 至 20%。' };
  }
  const months = Math.round(y * 12);
  const i = pct / 100 / 12;
  const grownBal = i === 0 ? bal : bal * (1 + i) ** months;
  const contribFv =
    i === 0 ? pmt * months : pmt * (((1 + i) ** months - 1) / i);
  return {
    months,
    futureValue: roundMoney(grownBal + contribFv, 0),
    fromBalance: roundMoney(grownBal, 0),
    fromContrib: roundMoney(contribFv, 0),
  };
}

export function filterCspfFunds(funds, { scheme = '', kind = '', query = '' } = {}) {
  const q = String(query || '').trim().toLowerCase();
  return funds.filter((f) => {
    if (scheme && f.scheme !== scheme) return false;
    if (kind && f.kind !== kind) return false;
    if (q && !`${f.fund} ${f.category}`.toLowerCase().includes(q)) return false;
    return true;
  });
}
