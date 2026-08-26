import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateTobacco, CONCESSION_CIGARETTES, CONCESSION_CIGARS } from '../site/js/tobacco.js';

test('19 cigarettes passenger, cigarettes concession → no excess', () => {
  const r = calculateTobacco({
    sticks: 19,
    cigarGrams: 0,
    otherGrams: 0,
    concession: CONCESSION_CIGARETTES,
    age: 30,
    declared: true,
  });
  assert.equal(r.excessSticks, 0);
  assert.equal(r.totalDuty, 0);
  assert.equal(r.hasExcess, false);
});

test('100 cigarettes + 30g cigars does not auto-pick cigar allowance', () => {
  const cigs = calculateTobacco({
    sticks: 100,
    cigarGrams: 30,
    concession: CONCESSION_CIGARETTES,
    age: 30,
    declared: true,
  });
  assert.equal(cigs.excessSticks, 81);
  assert.equal(cigs.excessCigarGrams, 30);

  const cigars = calculateTobacco({
    sticks: 100,
    cigarGrams: 30,
    concession: CONCESSION_CIGARS,
    age: 30,
    declared: true,
  });
  assert.equal(cigars.excessSticks, 100);
  assert.equal(cigars.excessCigarGrams, 5);
});

test('cross-border driver gets no concession', () => {
  const r = calculateTobacco({
    sticks: 19,
    concession: CONCESSION_CIGARETTES,
    isDriver: true,
    age: 40,
    declared: false,
  });
  assert.equal(r.excessSticks, 19);
  assert.ok(r.totalDuty > 0);
});

test('statutory tobacco maximum is 2 million and 7 years', () => {
  const r = calculateTobacco({ sticks: 1, concession: CONCESSION_CIGARETTES, age: 20, declared: false });
  assert.equal(r.statutoryMax.fine, 2_000_000);
  assert.equal(r.statutoryMax.imprisonmentYears, 7);
});

test('undeclared excess shows compounding illustration 5x + 5000', () => {
  const r = calculateTobacco({
    sticks: 219,
    concession: CONCESSION_CIGARETTES,
    age: 30,
    declared: false,
  });
  assert.ok(r.compounding);
  assert.equal(r.compounding.fixedFine, 5000);
  assert.equal(r.compounding.fiveTimesDuty, r.totalDuty * 5);
});
