import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculatePension, commutationOptions } from '../docs/js/pension.js';

test('NPS commutation options stop at 50% in 5% steps', () => {
  assert.deepEqual(commutationOptions('nps'), [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50]);
});

test('OPS commutation options stop at 25%', () => {
  assert.deepEqual(commutationOptions('ops'), [0, 5, 10, 15, 20, 25]);
});

test('NPS rejects 55–95% commutation', () => {
  const r = calculatePension({
    scheme: 'nps',
    staffClass: 'A',
    monthlySalary: 27000,
    appointDate: '1996-01-01',
    retireDate: '2021-01-01',
    commutePct: 95,
  });
  assert.equal(r.error.includes('50%'), true);
});

test('CSB NPS Cat A example: 27000 x 300 months, 50% commute', () => {
  const r = calculatePension({
    scheme: 'nps',
    staffClass: 'A',
    monthlySalary: 27000,
    appointDate: '1996-01-01',
    retireDate: '2021-01-01',
    commutePct: 50,
  });
  assert.equal(r.months, 300);
  assert.equal(r.unreduced, 144000);
  assert.equal(r.lumpSum, 1008000);
  assert.equal(r.reducedAnnual, 72000);
  assert.equal(r.monthlyPension, 6000);
});

test('CSB OPS Cat A example: 27000 x 300 months, 25% commute', () => {
  const r = calculatePension({
    scheme: 'ops',
    staffClass: 'A',
    monthlySalary: 27000,
    appointDate: '1996-01-01',
    retireDate: '2021-01-01',
    commutePct: 25,
  });
  assert.equal(r.unreduced, 162000);
  assert.equal(r.lumpSum, 567000);
  assert.equal(r.reducedAnnual, 121500);
});

test('CSB NPS Cat B mixed service example', () => {
  const r = calculatePension({
    scheme: 'nps',
    staffClass: 'B',
    monthlySalary: 10200,
    appointDate: '1996-01-01',
    retireDate: '2021-01-01',
    pre1987Months: 100,
    commutePct: 50,
  });
  assert.equal(r.unreduced, 51567);
  assert.equal(r.lumpSum, 360969);
});

test('NPS Cat B hits two-thirds cap', () => {
  const r = calculatePension({
    scheme: 'nps',
    staffClass: 'B',
    monthlySalary: 10200,
    appointDate: '1980-01-01',
    retireDate: '2021-09-01',
    pre1987Months: 200,
    commutePct: 50,
  });
  assert.equal(r.capped, true);
  assert.equal(r.unreduced, 81600);
});

test('NPS short service gratuity Cat A 60 months', () => {
  const r = calculatePension({
    scheme: 'nps',
    staffClass: 'A',
    monthlySalary: 27000,
    appointDate: '2016-01-01',
    retireDate: '2021-01-01',
    commutePct: 0,
  });
  assert.equal(r.belowMinService, true);
  assert.equal(r.shortServiceGratuity, 201600);
});
