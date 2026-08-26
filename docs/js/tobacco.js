import { LEGAL_DATA } from '../data/legal-data.js';
import { roundMoney } from './util.js';

export const CONCESSION_NONE = 'none';
export const CONCESSION_CIGARETTES = 'cigarettes';
export const CONCESSION_CIGARS = 'cigars';
export const CONCESSION_OTHER = 'other';

/**
 * Duty + excess quantities. Caller MUST choose one concession (OR rule).
 * Mixed goods: the unselected categories get no allowance.
 */
export function calculateTobacco(input) {
  const t = LEGAL_DATA.tobacco;
  const sticks = Math.max(0, Math.floor(Number(input.sticks) || 0));
  const extraLongUnits = Math.max(0, Math.floor(Number(input.extraLongUnits) || 0));
  const chargeableSticks = sticks + extraLongUnits;
  const cigarGrams = Math.max(0, Number(input.cigarGrams) || 0);
  const otherGrams = Math.max(0, Number(input.otherGrams) || 0);
  const isDriver = Boolean(input.isDriver);
  const isCommercial = Boolean(input.isCommercial);
  const age = Number(input.age);
  const underAge = Number.isFinite(age) ? age < t.allowance.minAge : false;
  const declared = Boolean(input.declared);

  let concession = input.concession || CONCESSION_NONE;
  const eligible = !isDriver && !isCommercial && !underAge;
  if (!eligible) concession = CONCESSION_NONE;

  let excessSticks = chargeableSticks;
  let excessCigarGrams = cigarGrams;
  let excessOtherGrams = otherGrams;
  let concessionApplied = '無免稅優惠';

  if (eligible) {
    if (concession === CONCESSION_CIGARETTES) {
      excessSticks = Math.max(0, chargeableSticks - t.allowance.cigarettes);
      concessionApplied = `選用香煙免稅：${t.allowance.cigarettes} 支`;
    } else if (concession === CONCESSION_CIGARS) {
      excessCigarGrams = Math.max(
        0,
        cigarGrams - t.allowance.cigarCountOrGrams.maxGramsIfMoreThanOne,
      );
      concessionApplied = `選用雪茄免稅：1 支，或多於 1 支則總重不超過 ${t.allowance.cigarCountOrGrams.maxGramsIfMoreThanOne} 克`;
    } else if (concession === CONCESSION_OTHER) {
      excessOtherGrams = Math.max(0, otherGrams - t.allowance.otherManufacturedGrams);
      concessionApplied = `選用其他製成煙草免稅：${t.allowance.otherManufacturedGrams} 克`;
    } else {
      concessionApplied = '未選用免稅優惠（全部按應課稅數量計算）';
    }
  } else if (isDriver) {
    concessionApplied = '跨境司機不享有免稅優惠';
  } else if (isCommercial) {
    concessionApplied = '貿易／商業用途不享有免稅優惠';
  } else if (underAge) {
    concessionApplied = `未滿 ${t.allowance.minAge} 歲不享有免稅優惠`;
  }

  const cigDuty = (excessSticks / 1000) * t.cigaretteDutyPer1000;
  const cigarDuty = (excessCigarGrams / 1000) * t.cigarDutyPerKg;
  const otherDuty = (excessOtherGrams / 1000) * t.otherManufacturedDutyPerKg;
  const totalDuty = cigDuty + cigarDuty + otherDuty;

  const hasExcess = excessSticks > 0 || excessCigarGrams > 0 || excessOtherGrams > 0;
  let compounding = null;
  if (!declared && hasExcess) {
    compounding = {
      fiveTimesDuty: roundMoney(totalDuty * t.compoundingDutyMultiplier),
      fixedFine: t.compoundableFixedFineHkd,
      total: roundMoney(totalDuty * t.compoundingDutyMultiplier + t.compoundableFixedFineHkd),
      discretionary: true,
      note: t.compoundingMultiplierSourceNote,
    };
  }

  return {
    chargeableSticks,
    excessSticks,
    excessCigarGrams: roundMoney(excessCigarGrams, 3),
    excessOtherGrams: roundMoney(excessOtherGrams, 3),
    cigDuty: roundMoney(cigDuty),
    cigarDuty: roundMoney(cigarDuty),
    otherDuty: roundMoney(otherDuty),
    totalDuty: roundMoney(totalDuty),
    concessionApplied,
    eligible,
    declared,
    hasExcess,
    compounding,
    statutoryMax: {
      fine: t.maxFineHkd,
      imprisonmentYears: t.maxImprisonmentYears,
    },
    lastVerified: LEGAL_DATA.lastVerified,
  };
}
