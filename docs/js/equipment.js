export function formatMinutesToTime(totalMins) {
  const normalized = ((totalMins % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(normalized / 60)
    .toString()
    .padStart(2, '0');
  const m = Math.floor(normalized % 60)
    .toString()
    .padStart(2, '0');
  return `${h}:${m}`;
}

export function clockToMinutes(hhmm) {
  if (typeof hhmm === 'number' && Number.isFinite(hhmm)) return hhmm;
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '').trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

export const MEAL_PRESETS = [
  {
    label: '早餐',
    windowStart: '08:30',
    windowEnd: '09:00',
  },
  {
    label: '午餐',
    windowStart: '12:00',
    windowEnd: '13:00',
  },
];

function toAbs(clockMins, shiftStart, shiftEnd) {
  let t = clockMins;
  if (shiftEnd > 1440 && t < shiftStart) t += 1440;
  return t;
}

function subtractOccupied(rangeStart, rangeEnd, occupied) {
  let holes = [[rangeStart, rangeEnd]];
  for (const b of occupied) {
    const next = [];
    for (const [a, c] of holes) {
      const os = Math.max(a, b.start);
      const oe = Math.min(c, b.end);
      if (os >= oe) {
        next.push([a, c]);
        continue;
      }
      if (a < os) next.push([a, os]);
      if (oe < c) next.push([oe, c]);
    }
    holes = next;
  }
  return holes.filter(([a, c]) => c > a);
}

function pickPlacement(holes, duration, prefer) {
  const fit = holes.filter(([a, c]) => c - a >= duration);
  if (!fit.length) return null;
  const contained = fit.find(([a, c]) => prefer >= a && prefer + duration <= c);
  if (contained) return { start: prefer, end: prefer + duration };
  const overlapping = fit.find(([a, c]) => prefer >= a && prefer < c);
  const [a, c] = overlapping || fit[0];
  const latest = c - duration;
  const start = Math.min(Math.max(prefer, a), latest);
  return { start, end: start + duration };
}

function resolveShiftRange(input) {
  let startTotalMins;
  let endTotalMins;
  if (input.startClock != null || input.endClock != null) {
    startTotalMins = clockToMinutes(input.startClock);
    endTotalMins = clockToMinutes(input.endClock);
  } else {
    startTotalMins = Number(input.startHour) * 60 + Number(input.startMin);
    endTotalMins = Number(input.endHour) * 60 + Number(input.endMin);
  }
  if (!Number.isFinite(startTotalMins) || !Number.isFinite(endTotalMins)) {
    return { error: '請輸入有效時間。' };
  }
  if (endTotalMins <= startTotalMins) endTotalMins += 24 * 60;
  return { startTotalMins, endTotalMins };
}

function placeMeals(shiftStart, shiftEnd, breaks) {
  const placed = [];
  const pending = breaks.map((b, i) => {
    const label = String(b.label || `時段 ${i + 1}`).trim() || `時段 ${i + 1}`;
    const windowStartClock = clockToMinutes(b.windowStart);
    const windowEndClock = clockToMinutes(b.windowEnd);
    return {
      index: i,
      label,
      windowStartClock,
      windowEndClock,
    };
  });

  for (const b of pending) {
    if (b.windowStartClock == null || b.windowEndClock == null) {
      return { error: `「${b.label}」請輸入有效的由／至時間。` };
    }
  }

  pending.sort((a, b) => {
    const aw = toAbs(a.windowStartClock, shiftStart, shiftEnd);
    const bw = toAbs(b.windowStartClock, shiftStart, shiftEnd);
    if (aw !== bw) return aw - bw;
    return a.index - b.index;
  });

  for (const b of pending) {
    let ws = toAbs(b.windowStartClock, shiftStart, shiftEnd);
    let we = toAbs(b.windowEndClock, shiftStart, shiftEnd);
    if (we <= ws) we += 24 * 60;
    const duration = we - ws;
    if (duration < 1) {
      return { error: `「${b.label}」由／至時長無效。` };
    }
    const availStart = Math.max(shiftStart, ws);
    const availEnd = Math.min(shiftEnd, we);
    if (availEnd - availStart < duration) {
      return {
        error: `「${b.label}」的由／至不在當更時間內，或與當更重疊不足。`,
      };
    }
    const holes = subtractOccupied(shiftStart, shiftEnd, placed);
    const spot = pickPlacement(holes, duration, ws);
    if (!spot) {
      return {
        error: `無法安插「${b.label}」：與其他固定時段重疊。`,
      };
    }
    placed.push({
      kind: 'meal',
      label: b.label,
      start: spot.start,
      end: spot.end,
      minutes: duration,
    });
  }

  placed.sort((a, b) => a.start - b.start);
  return { placed };
}

function fillDuty(shiftStart, shiftEnd, meals, staffCount) {
  const occupied = meals.slice().sort((a, b) => a.start - b.start);
  const workSpans = [];
  let cursor = shiftStart;
  for (const m of occupied) {
    if (cursor < m.start) workSpans.push([cursor, m.start]);
    cursor = Math.max(cursor, m.end);
  }
  if (cursor < shiftEnd) workSpans.push([cursor, shiftEnd]);

  const workTotal = workSpans.reduce((s, [a, c]) => s + (c - a), 0);
  if (workTotal < staffCount) {
    return { error: '扣除固定時段後，剩餘工時不足以每人至少 1 分鐘。' };
  }
  const base = Math.floor(workTotal / staffCount);
  const quota = Array.from({ length: staffCount }, (_, i) =>
    i === staffCount - 1 ? workTotal - base * (staffCount - 1) : base,
  );

  const dutySlots = [];
  let person = 0;
  let left = quota[0];
  for (const [spanStart, spanEnd] of workSpans) {
    let t = spanStart;
    while (t < spanEnd && person < staffCount) {
      const take = Math.min(left, spanEnd - t);
      dutySlots.push({
        kind: 'duty',
        letter: String.fromCharCode(65 + person),
        start: t,
        end: t + take,
        minutes: take,
      });
      t += take;
      left -= take;
      if (left === 0) {
        person += 1;
        left = person < staffCount ? quota[person] : 0;
      }
    }
  }

  const totals = {};
  for (let i = 0; i < staffCount; i++) {
    const letter = String.fromCharCode(65 + i);
    totals[letter] = quota[i];
  }
  return { dutySlots, workTotal, perPersonMins: base, totals };
}

/**
 * Equal split, optionally inserting named fixed blocks (meals) inside
 * typical eating windows, then balancing leftover duty time.
 */
export function splitEquipmentWindow(input) {
  const n = Math.floor(Number(input.staffCount));
  if (!Number.isFinite(n) || n < 1 || n > 26) {
    return { error: '人數須為 1 至 26。' };
  }
  const range = resolveShiftRange(input);
  if (range.error) return range;
  const { startTotalMins, endTotalMins } = range;
  const totalDurationMins = endTotalMins - startTotalMins;
  const breaks = Array.isArray(input.breaks) ? input.breaks.filter(Boolean) : [];

  if (breaks.length === 0) {
    const perPersonMins = Math.floor(totalDurationMins / n);
    const slots = [];
    let currentStart = startTotalMins;
    for (let i = 0; i < n; i++) {
      const currentEnd = i === n - 1 ? endTotalMins : currentStart + perPersonMins;
      slots.push({
        kind: 'duty',
        letter: String.fromCharCode(65 + i),
        start: formatMinutesToTime(currentStart),
        end: formatMinutesToTime(currentEnd),
        minutes: currentEnd - currentStart,
      });
      currentStart = currentEnd;
    }
    return { totalDurationMins, workTotalMins: totalDurationMins, perPersonMins, slots };
  }

  const mealResult = placeMeals(startTotalMins, endTotalMins, breaks);
  if (mealResult.error) return mealResult;
  const dutyResult = fillDuty(startTotalMins, endTotalMins, mealResult.placed, n);
  if (dutyResult.error) return dutyResult;

  const merged = [...mealResult.placed, ...dutyResult.dutySlots].sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    return a.kind === 'meal' ? -1 : 1;
  });

  const slots = merged.map((s) => ({
    kind: s.kind,
    letter: s.letter || '',
    label: s.label || '',
    start: formatMinutesToTime(s.start),
    end: formatMinutesToTime(s.end),
    minutes: s.minutes,
  }));

  return {
    totalDurationMins,
    workTotalMins: dutyResult.workTotal,
    perPersonMins: dutyResult.perPersonMins,
    totals: dutyResult.totals,
    slots,
  };
}
