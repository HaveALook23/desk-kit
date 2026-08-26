import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localISODate, completedMonths, parseLocalISODate } from '../docs/js/util.js';
import { shiftOnDate } from '../docs/js/shift.js';

test('localISODate uses local calendar, not UTC ISO', () => {
  const d = new Date(2026, 7, 26, 3, 0, 0); // 26/08/2026 03:00 HKT-like local
  assert.equal(localISODate(d), '2026-08-26');
  assert.equal(d.toISOString().split('T')[0] !== '2026-08-26' || d.getTimezoneOffset() <= 0, true);
});

test('parseLocalISODate does not shift a day', () => {
  const d = parseLocalISODate('2026-08-26');
  assert.equal(d.getFullYear(), 2026);
  assert.equal(d.getMonth(), 7);
  assert.equal(d.getDate(), 26);
});

test('completedMonths matches 25 years = 300', () => {
  assert.equal(
    completedMonths(parseLocalISODate('1996-01-01'), parseLocalISODate('2021-01-01')),
    300,
  );
});

test('cyclic shift is stable across local midnight', () => {
  const staff = { patternKey: 'pattern1', anchorDate: '2026-08-26', anchorType: 0 };
  const a = shiftOnDate(staff, parseLocalISODate('2026-08-26'));
  const b = shiftOnDate(staff, parseLocalISODate('2026-08-27'));
  assert.equal(a.name, '早 1');
  assert.equal(b.name, '早 2');
});

test('eight-day roster: 15/06/2026 頭早 then wraps', () => {
  const staff = { patternKey: 'cne8', anchorDate: '2026-06-15', anchorType: 0 };
  assert.equal(shiftOnDate(staff, parseLocalISODate('2026-06-15')).name, '頭早');
  assert.equal(shiftOnDate(staff, parseLocalISODate('2026-06-16')).name, '二早');
  assert.equal(shiftOnDate(staff, parseLocalISODate('2026-06-19')).name, '頭通');
  assert.equal(shiftOnDate(staff, parseLocalISODate('2026-06-22')).name, 'OFF');
  assert.equal(shiftOnDate(staff, parseLocalISODate('2026-06-23')).name, '頭早');
});
