import { parseLocalISODate } from './util.js';

export const SHIFT_PATTERNS = {
  pattern1: {
    name: '早1 早2 放假1 晏1 晏2 放假2',
    cyclic: true,
    shifts: [
      { name: '早 1', kind: 'morning' },
      { name: '早 2', kind: 'morning' },
      { name: '放假 1', kind: 'off' },
      { name: '晏 1', kind: 'afternoon' },
      { name: '晏 2', kind: 'afternoon' },
      { name: '放假 2', kind: 'off' },
    ],
  },
  pattern2: {
    name: '早1 晏1 Swing 早2 晏2 放假1 早3 晏3 放假2',
    cyclic: true,
    shifts: [
      { name: '早 1', kind: 'morning' },
      { name: '晏 1', kind: 'afternoon' },
      { name: 'Swing', kind: 'swing' },
      { name: '早 2', kind: 'morning' },
      { name: '晏 2', kind: 'afternoon' },
      { name: '放假 1', kind: 'off' },
      { name: '早 3', kind: 'morning' },
      { name: '晏 3', kind: 'afternoon' },
      { name: '放假 2', kind: 'off' },
    ],
  },
  pattern3: {
    name: '早1 晏1 Swing 早2 晏2 放假',
    cyclic: true,
    shifts: [
      { name: '早 1', kind: 'morning' },
      { name: '晏 1', kind: 'afternoon' },
      { name: 'Swing', kind: 'swing' },
      { name: '早 2', kind: 'morning' },
      { name: '晏 2', kind: 'afternoon' },
      { name: '放假', kind: 'off' },
    ],
  },
  pattern4: {
    name: '早1 早2 晏1 晏2 放假1 通宵1 通宵2 放假2',
    cyclic: true,
    shifts: [
      { name: '早 1', kind: 'morning' },
      { name: '早 2', kind: 'morning' },
      { name: '晏 1', kind: 'afternoon' },
      { name: '晏 2', kind: 'afternoon' },
      { name: '放假 1', kind: 'off-prep' },
      { name: '通宵 1', kind: 'night' },
      { name: '通宵 2', kind: 'night' },
      { name: '放假 2', kind: 'off' },
    ],
  },
  pattern5: {
    name: '五天工作週（星期六日放假）',
    cyclic: false,
    shifts: [
      { name: '常規工作', kind: 'work' },
      { name: '週末放假', kind: 'off' },
    ],
  },
};

function daysBetweenLocal(a, b) {
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((utcB - utcA) / 86400000);
}

export function shiftOnDate(staff, date) {
  const pattern = SHIFT_PATTERNS[staff.patternKey] || SHIFT_PATTERNS.pattern1;
  if (!pattern.cyclic) {
    const dow = date.getDay();
    const weekend = dow === 0 || dow === 6;
    return weekend ? pattern.shifts[1] : pattern.shifts[0];
  }
  const anchor = parseLocalISODate(staff.anchorDate);
  if (!anchor) return pattern.shifts[0];
  const len = pattern.shifts.length;
  const anchorType = Number(staff.anchorType) || 0;
  const diff = daysBetweenLocal(anchor, date);
  const idx = ((anchorType + diff) % len + len) % len;
  return pattern.shifts[idx];
}

export function monthGrid(year, month) {
  const days = new Date(year, month, 0).getDate();
  const out = [];
  for (let d = 1; d <= days; d++) {
    out.push(new Date(year, month - 1, d));
  }
  return out;
}
