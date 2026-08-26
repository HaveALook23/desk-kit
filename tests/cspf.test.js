import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lookupCspf, projectSandbox } from '../docs/js/cspf.js';

test('legacy schedule matches CSB bands', () => {
  assert.equal(lookupCspf({ cohort: 'legacy', completedYears: 2 }).govRate, 0.05);
  assert.equal(lookupCspf({ cohort: 'legacy', completedYears: 3 }).govRate, 0.15);
  assert.equal(lookupCspf({ cohort: 'legacy', completedYears: 14 }).govRate, 0.15);
  assert.equal(lookupCspf({ cohort: 'legacy', completedYears: 15 }).govRate, 0.17);
  assert.equal(lookupCspf({ cohort: 'legacy', completedYears: 30 }).govRate, 0.25);
});

test('extended / post-2015 schedule stays at 15% until 18 years', () => {
  assert.equal(lookupCspf({ cohort: 'extended', completedYears: 16 }).govRate, 0.15);
  assert.equal(lookupCspf({ cohort: 'extended', completedYears: 18 }).govRate, 0.17);
  assert.equal(lookupCspf({ cohort: 'extended', completedYears: 35 }).govRate, 0.25);
});

test('disciplined services add 2.5% SDSC on top of government rate', () => {
  const r = lookupCspf({
    cohort: 'extended',
    completedYears: 10,
    disciplined: true,
    monthlySalary: 40000,
  });
  assert.equal(r.govRate, 0.15);
  assert.equal(r.sdscRate, 0.025);
  assert.equal(r.govMonthly, 6000);
  assert.equal(r.sdscMonthly, 1000);
  assert.equal(r.totalMonthly, 7000);
  assert.equal(r.gvcLikelyVested, true);
});

test('GVC not treated as vested before 10 years', () => {
  const r = lookupCspf({ cohort: 'extended', completedYears: 9, disciplined: false });
  assert.equal(r.gvcLikelyVested, false);
});

test('sandbox 0% return is just contributions plus balance', () => {
  const r = projectSandbox({
    monthlyAmount: 1000,
    years: 10,
    annualReturnPct: 0,
    currentBalance: 20000,
  });
  assert.equal(r.futureValue, 140000);
});

test('fund filter by scheme and kind', async () => {
  const { filterCspfFunds } = await import('../docs/js/cspf.js');
  const { CSPF_FUNDS } = await import('../docs/data/cspf-funds.js');
  const hsbc = filterCspfFunds(CSPF_FUNDS.funds, { scheme: '滙豐強積金智選計劃' });
  assert.ok(hsbc.length >= 15);
  assert.ok(hsbc.every((f) => f.scheme.includes('滙豐')));
  const cons = filterCspfFunds(CSPF_FUNDS.funds, { kind: 'conservative' });
  assert.ok(cons.length >= 3);
  assert.ok(cons.every((f) => f.category.includes('保守基金')));
});
