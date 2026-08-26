import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatDrawRecord, parseNameList, runLeaveDraw } from '../docs/js/draw.js';

test('parseNameList trims and dedupes', () => {
  assert.deepEqual(parseNameList('  A \nB\nA\n'), ['A', 'B']);
});

test('leave draw uses CSPRNG record with hashes', async () => {
  const record = await runLeaveDraw({
    namesText: 'Alice\nBob\nCara\nDan',
    quota: 2,
    rounds: 1,
    leaveDate: '2026-08-26',
    witnesses: 'Witness One',
    drawnAt: '2026-08-26T00:00:00+08:00',
  });
  assert.equal(record.error, undefined);
  assert.equal(record.rng, 'crypto.getRandomValues');
  assert.equal(record.inputHash.length, 64);
  assert.equal(record.resultHash.length, 64);
  assert.equal(record.results[0].selected.length, 2);
  assert.equal(record.participants.length, 4);
  const text = formatDrawRecord(record);
  assert.match(text, /Desk Kit 抽假紀錄/);
  assert.match(text, /合併雜湊/);
});
