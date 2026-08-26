import { LEGAL_DATA } from '../data/legal-data.js';
import {
  clearNode,
  el,
  formatHkd,
  localISODate,
  localYearMonth,
} from './util.js';
import { calculateTobacco } from './tobacco.js';
import { calculatePension, commutationOptions } from './pension.js';
import { SHIFT_PATTERNS, monthGrid, shiftOnDate } from './shift.js';
import { runLeaveDraw } from './draw.js';
import { calculateQuartersPoints } from './quarters.js';
import { splitEquipmentWindow } from './equipment.js';

const LAST_DRAW_KEY = 'desk-kit:last-draw';

function showView(name) {
  document.querySelectorAll('.view').forEach((v) => {
    v.classList.toggle('active', v.id === `view-${name}`);
  });
  document.querySelectorAll('nav.tabs button').forEach((b) => {
    if (b.dataset.view === name) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });
  if (name === 'shift') renderShift();
  if (name === 'draw') restoreDraw();
}

function kv(rows) {
  const box = el('div', { class: 'kv' });
  for (const [k, v] of rows) {
    box.append(el('span', { text: k }), el('span', { text: v }));
  }
  return box;
}

function fillVerified() {
  document.querySelectorAll('[data-bind="verified"]').forEach((n) => {
    n.textContent = LEGAL_DATA.lastVerified;
  });
}

function fillCommutes() {
  const scheme = document.getElementById('p-scheme').value;
  const select = document.getElementById('p-commute');
  const hint = document.getElementById('p-commute-hint');
  const opts = commutationOptions(scheme);
  const prev = select.value;
  clearNode(select);
  for (const p of opts) {
    const label =
      p === 0
        ? '0%（不折算）'
        : p === opts[opts.length - 1]
          ? `${p}%（${scheme === 'ops' ? 'OPS' : 'NPS'} 最高）`
          : `${p}%`;
    const opt = el('option', { value: String(p), text: label });
    if (p === opts[opts.length - 1]) opt.selected = true;
    select.append(opt);
  }
  if (opts.map(String).includes(prev)) select.value = prev;
  hint.textContent =
    scheme === 'ops'
      ? '舊計劃最高可折算 25%，須為 5% 倍數。'
      : '新計劃最高可折算 50%，須為 5% 倍數。55%–95% 不是合法折算上限。';
}

function onTobacco(ev) {
  ev.preventDefault();
  const role = document.getElementById('t-role').value;
  const r = calculateTobacco({
    sticks: document.getElementById('t-sticks').value,
    extraLongUnits: document.getElementById('t-long').value,
    cigarGrams: document.getElementById('t-cigar').value,
    otherGrams: document.getElementById('t-other').value,
    age: document.getElementById('t-age').value,
    isDriver: role === 'driver',
    isCommercial: role === 'commercial',
    declared: document.getElementById('t-decl').value === 'declared',
    concession: document.getElementById('t-conc').value,
  });
  const box = document.getElementById('tobacco-result');
  clearNode(box);
  box.classList.remove('hidden');
  box.append(
    el('h3', { text: '試算結果' }),
    kv([
      ['免稅優惠', r.concessionApplied],
      ['應課稅香煙（支）', String(r.excessSticks)],
      ['應課稅雪茄（克）', String(r.excessCigarGrams)],
      ['應課稅其他煙草（克）', String(r.excessOtherGrams)],
      ['香煙稅', `HK$ ${formatHkd(r.cigDuty)}`],
      ['雪茄稅', `HK$ ${formatHkd(r.cigarDuty)}`],
      ['其他煙草稅', `HK$ ${formatHkd(r.otherDuty)}`],
      ['應繳稅款合計', `HK$ ${formatHkd(r.totalDuty)}`],
    ]),
  );
  if (!r.hasExcess) {
    box.append(el('p', { class: 'ok', text: '按所選優惠，沒有超出免稅數量。是否真正符合免稅條件，以當值人員及現行規則為準。' }));
  } else if (r.declared) {
    box.append(el('p', { class: 'warn', text: '已假設紅通道申報。應繳稅款須向海關繳付。本工具不判斷是否獲准攜帶。' }));
  } else if (r.compounding) {
    box.append(
      el('p', {
        class: 'warn',
        text: `有代價地不予檢控屬部門酌情，不是必然結果。公開資料中的試算：5 × 稅款（HK$ ${formatHkd(r.compounding.fiveTimesDuty)}）+ 定額 HK$ ${formatHkd(r.compounding.fixedFine, 0)} = HK$ ${formatHkd(r.compounding.total)}。`,
      }),
      el('p', { class: 'hint', text: r.compounding.note }),
    );
  }
  box.append(
    el('p', {
      class: 'bad',
      text: `未完稅煙草相關罪行最高刑罰：罰款 HK$ ${formatHkd(r.statutoryMax.fine, 0)} 及監禁 ${r.statutoryMax.imprisonmentYears} 年。`,
    }),
    el('p', { class: 'hint', text: `最後核實 ${r.lastVerified}` }),
  );
}

function onPension(ev) {
  ev.preventDefault();
  const r = calculatePension({
    scheme: document.getElementById('p-scheme').value,
    staffClass: document.getElementById('p-class').value,
    monthlySalary: document.getElementById('p-salary').value,
    appointDate: document.getElementById('p-appoint').value,
    retireDate: document.getElementById('p-retire').value,
    commutePct: document.getElementById('p-commute').value,
    excludeMonths: document.getElementById('p-exclude').value,
    pre1987Months: document.getElementById('p-pre1987').value,
  });
  const box = document.getElementById('pension-result');
  clearNode(box);
  box.classList.remove('hidden');
  if (r.error) {
    box.append(el('p', { class: 'bad', text: r.error }));
    return;
  }
  box.append(
    el('h3', { text: '粗算結果' }),
    kv([
      ['計劃', r.scheme === 'ops' ? 'OPS' : 'NPS'],
      ['可計算月數', String(r.months)],
      ['約年數', String(r.years)],
      ['最高年薪', `HK$ ${formatHkd(r.annual, 0)}`],
      ['未折算年退休金', `HK$ ${formatHkd(r.unreduced, 0)}`],
      ['三分之二上限', `HK$ ${formatHkd(r.cap, 0)}${r.capped ? '（已封頂）' : ''}`],
      ['折算比例', `${r.commutePct}%`],
      ['一筆過酬金', `HK$ ${formatHkd(r.lumpSum, 0)}`],
      ['折算後年退休金', `HK$ ${formatHkd(r.reducedAnnual, 0)}`],
      ['約每月退休金', `HK$ ${formatHkd(r.monthlyPension, 0)}`],
    ]),
  );
  if (r.belowMinService) {
    box.append(
      el('p', {
        class: 'warn',
        text: `服務期少於 10 年，正常退休可能只獲短期服務酬金，粗算 HK$ ${formatHkd(r.shortServiceGratuity, 0)}。以庫務署計算為準。`,
      }),
    );
  }
  box.append(
    el('p', {
      class: 'hint',
      text: `最後核實 ${r.lastVerified}。公務員事務局亦聲明其計算器只是粗略參考。`,
    }),
  );
}

let staffList = [
  { id: 1, name: '人員 A', patternKey: 'pattern1', anchorDate: '', anchorType: 0 },
];

function renderStaffConfig() {
  const box = document.getElementById('staff-config');
  clearNode(box);
  staffList.forEach((staff, index) => {
    const nameInput = el('input', { type: 'text', value: staff.name });
    nameInput.value = staff.name;
    nameInput.addEventListener('input', () => {
      staff.name = nameInput.value;
      renderRoster();
    });
    const pattern = el('select');
    for (const [key, p] of Object.entries(SHIFT_PATTERNS)) {
      const opt = el('option', { value: key, text: p.name });
      if (key === staff.patternKey) opt.selected = true;
      pattern.append(opt);
    }
    pattern.addEventListener('change', () => {
      staff.patternKey = pattern.value;
      renderRoster();
    });
    const date = el('input', { type: 'date' });
    date.value = staff.anchorDate || localISODate();
    staff.anchorDate = date.value;
    date.addEventListener('change', () => {
      staff.anchorDate = date.value;
      renderRoster();
    });
    const type = el('input', { type: 'number', min: '0', value: String(staff.anchorType) });
    type.addEventListener('input', () => {
      staff.anchorType = Number(type.value) || 0;
      renderRoster();
    });
    const del = el('button', { class: 'btn-ghost', type: 'button', text: '刪' });
    del.addEventListener('click', () => {
      staffList = staffList.filter((s) => s.id !== staff.id);
      renderShift();
    });
    box.append(el('div', { class: 'staff-row' }, nameInput, pattern, date, type, del));
    if (index === 0) {
      const legend = el('p', { class: 'hint', text: '欄位：姓名、更期、錨點日期、錨點更種序號（由 0 起）' });
      box.append(legend);
    }
  });
}

function renderRoster() {
  const monthVal = document.getElementById('shift-month').value || localYearMonth();
  const [ys, ms] = monthVal.split('-');
  const year = Number(ys);
  const month = Number(ms);
  const days = monthGrid(year, month);
  const box = document.getElementById('shift-table');
  clearNode(box);
  const table = el('table');
  const head = el('tr', {}, el('th', { text: '日' }));
  staffList.forEach((s) => head.append(el('th', { text: s.name || '（未命名）' })));
  table.append(el('thead', {}, head));
  const tbody = el('tbody');
  days.forEach((d) => {
    const tr = el('tr');
    tr.append(el('th', { text: String(d.getDate()) }));
    staffList.forEach((s) => {
      const cell = shiftOnDate(s, d);
      tr.append(el('td', { class: cell.kind, text: cell.name }));
    });
    tbody.append(tr);
  });
  table.append(tbody);
  box.append(table);
}

function renderShift() {
  const month = document.getElementById('shift-month');
  if (!month.value) month.value = localYearMonth();
  staffList.forEach((s) => {
    if (!s.anchorDate) s.anchorDate = localISODate();
  });
  renderStaffConfig();
  renderRoster();
}

function renderDrawRecord(record) {
  const box = document.getElementById('draw-result');
  clearNode(box);
  box.classList.remove('hidden');
  if (record.error) {
    box.append(el('p', { class: 'bad', text: record.error }));
    return;
  }
  box.append(
    el('h3', { text: '抽籤紀錄' }),
    kv([
      ['抽取時間', record.drawnAt],
      ['放假日期', record.leaveDate || '未填'],
      ['見證人', record.witnesses || '未填'],
      ['名額', String(record.quota)],
      ['參與人數', String(record.participantCount)],
      ['亂數', record.rng],
    ]),
  );
  record.results.forEach((round) => {
    const wrap = el('div');
    wrap.append(el('h3', { text: `第 ${round.round} 次` }));
    round.selected.forEach((name, i) => {
      wrap.append(
        el('div', { class: 'draw-person win' }, el('span', { text: `#${i + 1} ${name}` }), el('span', { text: '中籤' })),
      );
    });
    round.waitlist.forEach((name, i) => {
      wrap.append(
        el(
          'div',
          { class: 'draw-person' },
          el('span', { text: `#${round.selected.length + i + 1} ${name}` }),
          el('span', { text: '候補' }),
        ),
      );
    });
    box.append(wrap);
  });
  box.append(
    el('p', { class: 'hint', text: '輸入雜湊' }),
    el('p', { class: 'hash', text: record.inputHash }),
    el('p', { class: 'hint', text: '結果雜湊' }),
    el('p', { class: 'hash', text: record.resultHash }),
    el('p', { class: 'hint', text: '合併雜湊' }),
    el('p', { class: 'hash', text: record.combinedHash }),
  );
}

function restoreDraw() {
  const raw = sessionStorage.getItem(LAST_DRAW_KEY);
  if (!raw) return;
  try {
    renderDrawRecord(JSON.parse(raw));
  } catch {
    sessionStorage.removeItem(LAST_DRAW_KEY);
  }
}

async function onDraw(ev) {
  ev.preventDefault();
  if (sessionStorage.getItem(LAST_DRAW_KEY)) {
    const ok = window.confirm('此分頁已有一次抽籤紀錄。確定覆蓋並開新一輪？');
    if (!ok) return;
  }
  const record = await runLeaveDraw({
    namesText: document.getElementById('d-names').value,
    quota: document.getElementById('d-quota').value,
    rounds: document.getElementById('d-rounds').value,
    leaveDate: document.getElementById('d-date').value,
    witnesses: document.getElementById('d-witness').value,
    drawnAt: new Date().toISOString(),
  });
  if (!record.error) sessionStorage.setItem(LAST_DRAW_KEY, JSON.stringify(record));
  renderDrawRecord(record);
}

function onEquipment(ev) {
  ev.preventDefault();
  const r = splitEquipmentWindow({
    startHour: document.getElementById('eq-sh').value,
    startMin: document.getElementById('eq-sm').value,
    endHour: document.getElementById('eq-eh').value,
    endMin: document.getElementById('eq-em').value,
    staffCount: document.getElementById('eq-n').value,
  });
  const box = document.getElementById('eq-result');
  clearNode(box);
  box.classList.remove('hidden');
  if (r.error) {
    box.append(el('p', { class: 'bad', text: r.error }));
    return;
  }
  r.slots.forEach((s) => {
    box.append(el('p', { text: `${s.letter}　${s.start} – ${s.end}` }));
  });
}

function onQuarters(ev) {
  ev.preventDefault();
  const r = calculateQuartersPoints({
    salary: document.getElementById('q-salary').value,
    appointment: document.getElementById('q-appointment').value,
    deadline: document.getElementById('q-deadline').value,
    daysNotCounted: document.getElementById('q-days').value,
    maritalStatus: document.getElementById('q-marital').value,
    spouseResiding: document.getElementById('q-spouse').value,
    childHK: document.getElementById('q-childhk').value,
    childOutside: document.getElementById('q-childout').value,
    childExpected: document.getElementById('q-childexp').value,
  });
  const box = document.getElementById('q-result');
  clearNode(box);
  box.classList.remove('hidden');
  box.append(el('p', { class: 'warn', text: '非正式官方分數。' }));
  if (!r.ready) {
    box.append(el('p', { text: '請至少填月薪、受聘日期及截止日期。' }));
    return;
  }
  box.append(
    kv([
      ['薪酬分', r.parts.salary.toFixed(3)],
      ['年資分', r.parts.service.toFixed(3)],
      ['配偶分', r.parts.spouse.toFixed(3)],
      ['在港子女', r.parts.childHK.toFixed(3)],
      ['境外子女', r.parts.childOutside.toFixed(3)],
      ['預期子女', r.parts.childExpected.toFixed(3)],
      ['總分', r.total.toFixed(3)],
    ]),
  );
}

function bindNav() {
  document.querySelectorAll('[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => showView(btn.dataset.view));
  });
}

function init() {
  fillVerified();
  fillCommutes();
  bindNav();
  document.getElementById('p-scheme').addEventListener('change', fillCommutes);
  document.getElementById('tobacco-form').addEventListener('submit', onTobacco);
  document.getElementById('pension-form').addEventListener('submit', onPension);
  document.getElementById('shift-month').addEventListener('change', renderRoster);
  document.getElementById('add-staff').addEventListener('click', () => {
    staffList.push({
      id: Date.now(),
      name: `人員 ${String.fromCharCode(65 + staffList.length)}`,
      patternKey: 'pattern1',
      anchorDate: localISODate(),
      anchorType: 0,
    });
    renderShift();
  });
  document.getElementById('draw-form').addEventListener('submit', onDraw);
  document.getElementById('draw-new').addEventListener('click', () => {
    sessionStorage.removeItem(LAST_DRAW_KEY);
    document.getElementById('draw-result').classList.add('hidden');
  });
  document.getElementById('eq-form').addEventListener('submit', onEquipment);
  document.getElementById('q-form').addEventListener('submit', onQuarters);
  document.getElementById('d-date').value = localISODate();
  document.getElementById('q-deadline').value = localISODate();
}

init();
