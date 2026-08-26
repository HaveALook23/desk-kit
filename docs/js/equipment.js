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
    durationMin: 30,
    windowStart: '08:00',
    windowEnd: '09:30',
    preferStart: '08:30',
  },
  {
    label: '午餐',
    durationMin: 60,
    windowStart: '11:30',
    windowEnd: '13:30',
    preferStart: '12:00',
  },
];

function preferForLabel(label) {
  if (label.includes('早')) return '08:30';
  if (label.includes('午')) return '12:00';
  if (label.includes('晚') || label.includes('夜')) return '18:30';
  return null;
}

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
    const duration = Math.floor(Number(b.durationMin));
    const label = String(b.label || `時段 ${i + 1}`).trim() || `時段 ${i + 1}`;
    const windowStartClock = clockToMinutes(b.windowStart);
    const windowEndClock = clockToMinutes(b.windowEnd);
    const preferClock =
      clockToMinutes(b.preferStart) ??
      clockToMinutes(preferForLabel(label));
    return {
      index: i,
      label,
      duration,
      windowStartClock,
      windowEndClock,
      preferClock,
    };
  });

  for (const b of pending) {
    if (!Number.isFinite(b.duration) || b.duration < 1) {
      return { error: `「${b.label}」時長須為正整數分鐘。` };
    }
    if (b.windowStartClock == null || b.windowEndClock == null) {
      return { error: `「${b.label}」請輸入有效的食用時段。` };
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
    const availStart = Math.max(shiftStart, ws);
    const availEnd = Math.min(shiftEnd, we);
    if (availEnd - availStart < b.duration) {
      return {
        error: `「${b.label}」的食用時段與當更時間重疊不足 ${b.duration} 分鐘。`,
      };
    }
    const preferRaw =
      b.preferClock == null
        ? Math.floor((availStart + availEnd - b.duration) / 2)
        : toAbs(b.preferClock, shiftStart, shiftEnd);
    const holes = subtractOccupied(availStart, availEnd, placed);
    const spot = pickPlacement(holes, b.duration, preferRaw);
    if (!spot) {
      return {
        error: `無法安插「${b.label}」：與其他固定時段重疊，或食用時段內沒有足夠空檔。`,
      };
    }
    placed.push({
      kind: 'meal',
      label: b.label,
      start: spot.start,
      end: spot.end,
      minutes: b.duration,
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
