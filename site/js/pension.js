import { LEGAL_DATA } from '../data/legal-data.js';
import { completedMonths, parseLocalISODate, roundMoney } from './util.js';

export function commutationOptions(scheme) {
  const spec = scheme === 'ops' ? LEGAL_DATA.pension.ops : LEGAL_DATA.pension.nps;
  const out = [];
  for (let p = 0; p <= spec.maxCommutationPct; p += spec.commutationStep) {
    out.push(p);
  }
  return out;
}

function npsUnreduced(annual, months, staffClass, pre1987Months) {
  const n = LEGAL_DATA.pension.nps;
  if (staffClass === 'B' && pre1987Months > 0) {
    const pre = Math.min(pre1987Months, months);
    const post = Math.max(0, months - pre);
    return annual * (pre * n.categoryBPre1987Factor + post * n.categoryBFrom1987Factor);
  }
  const factor =
    staffClass === 'B' && pre1987Months === 0
      ? n.categoryBFrom1987Factor
      : n.categoryAFactor;
  return annual * months * factor;
}

function opsUnreduced(annual, months, staffClass) {
  const o = LEGAL_DATA.pension.ops;
  if (staffClass === 'B') {
    const first = Math.min(months, o.categoryBFirst25YearsMonths);
    const rest = Math.max(0, months - first);
    return annual * (first * o.categoryBFirst25YearsFactor + rest * o.categoryBAfter25YearsFactor);
  }
  return annual * months * o.categoryAFactor;
}

/**
 * Normal-retirement rough indication only (CSB calculator assumptions).
 * Does not model operational-grounds enhancement, invaliding, or redundancy.
 */
export function calculatePension(input) {
  const scheme = input.scheme === 'ops' ? 'ops' : 'nps';
  const spec = scheme === 'ops' ? LEGAL_DATA.pension.ops : LEGAL_DATA.pension.nps;
  const staffClass = input.staffClass === 'B' ? 'B' : 'A';
  const salary = Number(input.monthlySalary) || 0;
  const appoint = parseLocalISODate(input.appointDate);
  const retire = parseLocalISODate(input.retireDate);
  const excludeMonths = Math.max(0, Math.floor(Number(input.excludeMonths) || 0));
  const pre1987Months = Math.max(0, Math.floor(Number(input.pre1987Months) || 0));
  let commutePct = Number(input.commutePct);
  if (!Number.isFinite(commutePct)) commutePct = spec.maxCommutationPct;
  if (commutePct < 0) commutePct = 0;
  if (commutePct > spec.maxCommutationPct) {
    return {
      error: `折算比例不可超過 ${scheme === 'ops' ? 'OPS 25%' : 'NPS 50%'}。`,
    };
  }
  if (commutePct % spec.commutationStep !== 0) {
    return { error: '折算比例須為 5% 的倍數。' };
  }
  if (!salary || !appoint || !retire) {
    return { error: '請輸入最高可計算退休金月薪、入職日期及退休日期。' };
  }
  if (retire <= appoint) {
    return { error: '退休日期必須晚於入職日期。' };
  }

  const rawMonths = completedMonths(appoint, retire);
  const months = Math.max(0, rawMonths - excludeMonths);
  const years = months / 12;
  const annual = salary * 12;

  const uncapped =
    scheme === 'ops'
      ? opsUnreduced(annual, months, staffClass)
      : npsUnreduced(annual, months, staffClass, pre1987Months);

  const cap = annual * LEGAL_DATA.pension.maxPensionFractionOfAnnualEmoluments;
  const capped = uncapped > cap;
  const unreduced = roundMoney(capped ? cap : uncapped, 0);

  const commuteDecimal = commutePct / 100;
  const lumpSum = unreduced * commuteDecimal * LEGAL_DATA.pension.commutationFactor;
  const reducedAnnual = unreduced * (1 - commuteDecimal);
  const monthlyPension = reducedAnnual / 12;

  const belowMinService = years < spec.minQualifyingYearsForPension;
  const shortServiceGratuity = belowMinService
    ? uncapped * spec.shortServiceGratuityMultiplier
    : null;

  return {
    scheme,
    staffClass,
    months,
    years: roundMoney(years, 2),
    annual: roundMoney(annual, 0),
    unreduced: roundMoney(unreduced, 0),
    cap: roundMoney(cap, 0),
    capped,
    commutePct,
    lumpSum: roundMoney(lumpSum, 0),
    reducedAnnual: roundMoney(reducedAnnual, 0),
    monthlyPension: roundMoney(monthlyPension, 0),
    belowMinService,
    shortServiceGratuity: belowMinService ? roundMoney(shortServiceGratuity, 0) : null,
    lastVerified: LEGAL_DATA.lastVerified,
  };
}
