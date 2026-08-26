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

export function splitEquipmentWindow({ startHour, startMin, endHour, endMin, staffCount }) {
  const n = Math.floor(Number(staffCount));
  if (!Number.isFinite(n) || n < 1 || n > 26) {
    return { error: '人數須為 1 至 26。' };
  }
  let startTotalMins = Number(startHour) * 60 + Number(startMin);
  let endTotalMins = Number(endHour) * 60 + Number(endMin);
  if (!Number.isFinite(startTotalMins) || !Number.isFinite(endTotalMins)) {
    return { error: '請輸入有效時間。' };
  }
  if (endTotalMins <= startTotalMins) endTotalMins += 24 * 60;
  const totalDurationMins = endTotalMins - startTotalMins;
  const perPersonMins = Math.floor(totalDurationMins / n);
  const slots = [];
  let currentStart = startTotalMins;
  for (let i = 0; i < n; i++) {
    const currentEnd = i === n - 1 ? endTotalMins : currentStart + perPersonMins;
    slots.push({
      letter: String.fromCharCode(65 + i),
      start: formatMinutesToTime(currentStart),
      end: formatMinutesToTime(currentEnd),
      minutes: currentEnd - currentStart,
    });
    currentStart = currentEnd;
  }
  return { totalDurationMins, perPersonMins, slots };
}
