import { canonicalJson, cryptoShuffle, sha256Hex } from './util.js';

export function parseNameList(text) {
  const seen = new Set();
  const names = [];
  for (const line of String(text || '').split(/\r?\n/)) {
    const name = line.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }
  return names;
}

export async function runLeaveDraw({
  namesText,
  quota,
  rounds,
  leaveDate,
  witnesses,
  drawnAt,
}) {
  const names = parseNameList(namesText);
  const q = Math.floor(Number(quota));
  const r = Math.floor(Number(rounds));
  if (names.length === 0) return { error: '請輸入至少一個姓名，每行一個。' };
  if (!Number.isFinite(q) || q < 1) return { error: '名額須為正整數。' };
  if (!Number.isFinite(r) || r < 1 || r > 20) return { error: '抽籤次數須為 1 至 20。' };

  const roundResults = [];
  for (let i = 0; i < r; i++) {
    const order = cryptoShuffle(names);
    roundResults.push({
      round: i + 1,
      selected: order.slice(0, Math.min(q, order.length)),
      waitlist: order.slice(Math.min(q, order.length)),
    });
  }

  const record = {
    drawnAt,
    leaveDate: leaveDate || '',
    witnesses: String(witnesses || '').trim(),
    quota: q,
    rounds: r,
    participants: names,
    participantCount: names.length,
    results: roundResults,
    rng: 'crypto.getRandomValues',
  };

  const inputHash = await sha256Hex(
    canonicalJson({
      drawnAt: record.drawnAt,
      leaveDate: record.leaveDate,
      witnesses: record.witnesses,
      quota: record.quota,
      rounds: record.rounds,
      participants: record.participants,
    }),
  );
  const resultHash = await sha256Hex(canonicalJson(record.results));
  record.inputHash = inputHash;
  record.resultHash = resultHash;
  record.combinedHash = await sha256Hex(`${inputHash}:${resultHash}`);
  return record;
}

export function formatDrawRecord(record) {
  if (!record || record.error) return '';
  const lines = [
    'Desk Kit 抽假紀錄',
    `抽取時間：${record.drawnAt}`,
    `放假日期：${record.leaveDate || '未填'}`,
    `見證人：${record.witnesses || '未填'}`,
    `名額：${record.quota}`,
    `亂數：${record.rng}`,
  ];
  record.results.forEach((round) => {
    lines.push('', `第 ${round.round} 次`);
    round.selected.forEach((name, i) => lines.push(`#${i + 1} ${name}　中籤`));
    round.waitlist.forEach((name, i) =>
      lines.push(`#${round.selected.length + i + 1} ${name}　候補`),
    );
  });
  lines.push(
    '',
    `輸入雜湊：${record.inputHash}`,
    `結果雜湊：${record.resultHash}`,
    `合併雜湊：${record.combinedHash}`,
  );
  return lines.join('\n');
}
