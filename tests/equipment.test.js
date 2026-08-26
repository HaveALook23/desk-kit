import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MEAL_PRESETS,
  splitEquipmentWindow,
} from '../docs/js/equipment.js';

test('equal split without meals keeps old behaviour', () => {
  const r = splitEquipmentWindow({
    startHour: 8,
    startMin: 0,
    endHour: 16,
    endMin: 0,
    staffCount: 4,
  });
  assert.equal(r.error, undefined);
  assert.equal(r.slots.length, 4);
  assert.equal(r.slots[0].start, '08:00');
  assert.equal(r.slots[0].end, '10:00');
  assert.equal(r.slots[3].end, '16:00');
});

test('0810-1600 breakfast 30m and lunch 60m land in eating hours and balance duty', () => {
  const r = splitEquipmentWindow({
    startClock: '08:10',
    endClock: '16:00',
    staffCount: 4,
    breaks: MEAL_PRESETS,
  });
  assert.equal(r.error, undefined);
  assert.equal(r.totalDurationMins, 470);
  assert.equal(r.workTotalMins, 380);
  assert.equal(r.perPersonMins, 95);

  const meals = r.slots.filter((s) => s.kind === 'meal');
  assert.deepEqual(
    meals.map((s) => `${s.label} ${s.start}-${s.end}`),
    ['早餐 08:30-09:00', '午餐 12:00-13:00'],
  );

  const dutyMins = {};
  for (const s of r.slots) {
    if (s.kind !== 'duty') continue;
    dutyMins[s.letter] = (dutyMins[s.letter] || 0) + s.minutes;
  }
  assert.deepEqual(dutyMins, { A: 95, B: 95, C: 95, D: 95 });

  assert.equal(r.slots[0].letter, 'A');
  assert.equal(r.slots[0].start, '08:10');
  assert.equal(r.slots[0].end, '08:30');
});

test('user can add a third fixed slot', () => {
  const r = splitEquipmentWindow({
    startClock: '08:10',
    endClock: '16:00',
    staffCount: 3,
    breaks: [
      ...MEAL_PRESETS,
      {
        label: '下午茶',
        durationMin: 15,
        windowStart: '15:00',
        windowEnd: '15:45',
        preferStart: '15:15',
      },
    ],
  });
  assert.equal(r.error, undefined);
  const tea = r.slots.find((s) => s.label === '下午茶');
  assert.equal(tea.start, '15:15');
  assert.equal(tea.end, '15:30');
  assert.equal(r.workTotalMins, 470 - 30 - 60 - 15);
});

test('meal outside the shift window is an error', () => {
  const r = splitEquipmentWindow({
    startClock: '14:00',
    endClock: '22:00',
    staffCount: 2,
    breaks: [MEAL_PRESETS[0]],
  });
  assert.match(r.error, /早餐/);
});

test('overlapping meal windows are staggered instead of stacked', () => {
  const r = splitEquipmentWindow({
    startClock: '08:00',
    endClock: '12:00',
    staffCount: 2,
    breaks: [
      {
        label: '早餐',
        durationMin: 60,
        windowStart: '08:00',
        windowEnd: '10:00',
        preferStart: '08:00',
      },
      {
        label: '加餐',
        durationMin: 60,
        windowStart: '08:30',
        windowEnd: '11:00',
        preferStart: '08:30',
      },
    ],
  });
  assert.equal(r.error, undefined);
  const meals = r.slots.filter((s) => s.kind === 'meal');
  assert.equal(meals[0].start, '08:00');
  assert.equal(meals[0].end, '09:00');
  assert.equal(meals[1].start, '09:00');
  assert.equal(meals[1].end, '10:00');
});
