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
import { lookupCspf, projectSandbox, filterCspfFunds } from './cspf.js';
import { CSPF_FUNDS } from '../data/cspf-funds.js';
import { SHIFT_PATTERNS, WEEKDAYS, monthGrid, rosterToText, shiftOnDate } from './shift.js';
import { formatDrawRecord, runLeaveDraw } from './draw.js';
import { calculateQuartersPoints } from './quarters.js';
import { splitEquipmentWindow } from './equipment.js';

const LAST_DRAW_KEY = 'desk-kit:last-draw';
const STAFF_KEY = 'desk-kit:staff';
const VIEWS = [
  'home',
  'tobacco',
  'pension',
  'shift',
  'draw',
  'equipment',
  'quarters',
  'homescreen',
  'sources',
];

function parseHash() {
  const raw = (location.hash || '#home').replace(/^#/, '');
  const [view, sub] = raw.split('/');
  return {
    view: VIEWS.includes(view) ? view : 'home',
    sub: sub || '',
  };
}

function writeHash(view, sub = '') {
  const next = sub ? `#${view}/${sub}` : `#${view}`;
  if (location.hash !== next) history.replaceState(null, '', next);
}

function applyHash() {
  const { view, sub } = parseHash();
  showView(view, { fromHash: true });
  if (view === 'pension') showRetire(sub === 'cspf' ? 'cspf' : 'opsnps', { fromHash: true });
}

function showView(name, opts = {}) {
  document.querySelectorAll('.view').forEach((v) => {
    v.classList.toggle('active', v.id === `view-${name}`);
  });
  document.querySelectorAll('nav.tabs button').forEach((b) => {
    if (b.dataset.view === name) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });
  if (name === 'shift') renderShift();
  if (name === 'draw') restoreDraw();
  if (name === 'pension') renderCspfSchemes();
  if (!opts.fromHash) {
    const sub = name === 'pension' && !document.getElementById('retire-cspf').classList.contains('hidden')
      ? 'cspf'
      : '';
    writeHash(name, sub);
  }
}

function kv(rows) {
  const box = el('div', { class: 'kv' });
  for (const [k, v] of rows) {
    box.append(el('span', { text: k }), el('span', { text: v }));
  }
  return box;
}

function copyText(text, okLabel) {
  const status = document.getElementById('copy-status');
  const done = (msg) => {
    if (!status) return;
    status.textContent = msg;
  };
  if (!text) {
    done('沒有可複製內容');
    return;
  }
  navigator.clipboard.writeText(text).then(
    () => done(okLabel || '已複製'),
    () => done('複製失敗，請手動選取'),
  );
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

function showRetire(name, opts = {}) {
  document.getElementById('retire-opsnps').classList.toggle('hidden', name !== 'opsnps');
  document.getElementById('retire-cspf').classList.toggle('hidden', name !== 'cspf');
  document.querySelectorAll('[data-retire]').forEach((b) => {
    if (b.dataset.retire === name) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });
  if (!opts.fromHash) writeHash('pension', name === 'cspf' ? 'cspf' : '');
}

function fillSchemeList(id, items) {
  const box = document.getElementById(id);
  if (!box) return;
  clearNode(box);
  items.forEach((s) => {
    const a = el('a', { href: s.url, target: '_blank', rel: 'noopener', text: s.name });
    const li = el('li');
    li.append(a, document.createTextNode(`　熱線 ${s.hotline}`));
    box.append(li);
  });
}

function renderCspfSchemes() {
  fillSchemeList('cspf-schemes-2026', LEGAL_DATA.cspf.schemes2026);
  fillSchemeList('cspf-schemes-old', LEGAL_DATA.cspf.schemesBefore2026);
  renderCspfRateTables();
  fillCspfFundSchemeOptions();
  const asof = document.getElementById('cspf-fund-asof');
  if (asof) asof.textContent = CSPF_FUNDS.asOf;
  renderCspfFundTable();
}

function renderCspfRateTables() {
  const box = document.getElementById('cspf-rate-tables');
  if (!box || box.dataset.ready) return;
  box.dataset.ready = '1';
  const labels = {
    legacy: '2000–2015 入職且未延長服務',
    extended: '已延長服務，或 2015-06-01 後入職',
  };
  for (const [key, title] of Object.entries(labels)) {
    box.append(el('h4', { text: title }));
    const table = el('table');
    const thead = el('tr', {}, el('th', { text: '無間斷服務年期' }), el('th', { text: '政府供款率' }));
    table.append(el('thead', {}, thead));
    const tb = el('tbody');
    LEGAL_DATA.cspf.schedules[key].forEach((row) => {
      tb.append(
        el(
          'tr',
          {},
          el('td', { text: row.label }),
          el('td', { text: `${(row.rate * 100).toFixed(0)}%` }),
        ),
      );
    });
    table.append(tb);
    box.append(table);
  }
  box.append(el('p', { class: 'hint', text: '紀律部隊另加基本薪金 2.5% 特別供款，不包括在上表。' }));
}

function fillCspfFundSchemeOptions() {
  const sel = document.getElementById('cspf-fund-scheme');
  if (!sel || sel.dataset.ready) return;
  sel.dataset.ready = '1';
  const names = [...new Set(CSPF_FUNDS.funds.map((f) => f.scheme))];
  names.forEach((name) => sel.append(el('option', { value: name, text: name })));
}

function fmtRet(n) {
  if (n == null || Number.isNaN(n)) return '—';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}`;
}

function retClass(n) {
  if (n == null || Number.isNaN(n)) return '';
  if (n > 0) return 'ret-up';
  if (n < 0) return 'ret-down';
  return '';
}

function shortScheme(name) {
  if (name.includes('滙豐')) return '滙豐';
  if (name.includes('宏利')) return '宏利';
  if (name.includes('永明')) return '永明';
  return name;
}

function renderCspfFundTable() {
  const tbody = document.querySelector('#cspf-fund-table tbody');
  if (!tbody) return;
  const scheme = document.getElementById('cspf-fund-scheme').value;
  const kind = document.getElementById('cspf-fund-kind').value;
  const query = document.getElementById('cspf-fund-q').value;
  const rows = filterCspfFunds(CSPF_FUNDS.funds, { scheme, kind, query }).slice();
  rows.sort((a, b) => (b.y2025 ?? -999) - (a.y2025 ?? -999));
  clearNode(tbody);
  rows.forEach((f) => {
    const tr = el('tr', { class: f.dis ? 'dis-row' : '' });
    const cells = [
      shortScheme(f.scheme),
      f.fund,
      f.category.split(' - ')[0],
      f.risk || '—',
      f.fer == null ? '—' : f.fer.toFixed(2),
    ];
    cells.forEach((txt) => tr.append(el('td', { text: txt })));
    for (const key of ['y2025', 'y2024', 'y2023', 'y2022', 'y2021']) {
      tr.append(el('td', { class: retClass(f[key]), text: fmtRet(f[key]) }));
    }
    tbody.append(tr);
  });
  const count = document.getElementById('cspf-fund-count');
  if (count) {
    count.textContent = `顯示 ${rows.length} / ${CSPF_FUNDS.funds.length} 隻。預設投資策略（核心累積／65歲後）會標示。`;
  }
}

function onCspf(ev) {
  ev.preventDefault();
  const r = lookupCspf({
    cohort: document.getElementById('cspf-cohort').value,
    completedYears: document.getElementById('cspf-years').value,
    disciplined: document.getElementById('cspf-disc').value === 'yes',
    monthlySalary: document.getElementById('cspf-salary').value,
  });
  const box = document.getElementById('cspf-result');
  clearNode(box);
  box.classList.remove('hidden');
  if (r.error) {
    box.append(el('p', { class: 'bad', text: r.error }));
    return;
  }
  const rows = [
    ['供款表', r.cohort === 'legacy' ? '未延長服務（舊表）' : '延長服務／2015 後入職'],
    ['年資檔', r.bandLabel],
    ['政府供款率（基本薪金）', `${(r.govRate * 100).toFixed(0)}%`],
    ['特別紀律部隊供款', r.sdscRate ? `${(r.sdscRate * 100).toFixed(1)}%` : '不適用'],
  ];
  if (r.totalMonthly != null) {
    rows.push(['本月政府供款粗算', `HK$ ${formatHkd(r.govMonthly, 0)}`]);
    if (r.sdscRate) rows.push(['本月特別供款粗算', `HK$ ${formatHkd(r.sdscMonthly, 0)}`]);
    rows.push(['本月合計粗算', `HK$ ${formatHkd(r.totalMonthly, 0)}`]);
  }
  box.append(el('h3', { text: '現時供款率' }), kv(rows));
  box.append(
    el('p', {
      class: r.gvcLikelyVested ? 'ok' : 'warn',
      text: r.gvcLikelyVested
        ? '按公開規則，連續服務滿 10 年（或已屆正常退休年齡）才會歸屬政府自願性供款。實際發放仍要部門核對，亦可能因紀律理由被扣減。'
        : '按公開規則，未滿 10 年且未屆正常退休年齡，政府自願性供款歸屬比率為 0%。離職通常只帶走強制性供款及你自己的自願供款。',
    }),
    el('p', { class: 'hint', text: LEGAL_DATA.cspf.gmcNote }),
    el('p', { class: 'hint', text: `最後核實 ${r.lastVerified}。這不是帳戶結餘。` }),
  );
}

function onCspfProj(ev) {
  ev.preventDefault();
  const r = projectSandbox({
    currentBalance: document.getElementById('cspf-bal').value,
    monthlyAmount: document.getElementById('cspf-pmt').value,
    years: document.getElementById('cspf-horizon').value,
    annualReturnPct: document.getElementById('cspf-return').value,
  });
  const box = document.getElementById('cspf-proj-result');
  clearNode(box);
  box.classList.remove('hidden');
  if (r.error) {
    box.append(el('p', { class: 'bad', text: r.error }));
    return;
  }
  box.append(
    el('h3', { text: '假設結果' }),
    kv([
      ['期末粗算', `HK$ ${formatHkd(r.futureValue, 0)}`],
      ['來自現有結餘', `HK$ ${formatHkd(r.fromBalance, 0)}`],
      ['來自其後供款', `HK$ ${formatHkd(r.fromContrib, 0)}`],
    ]),
    el('p', {
      class: 'warn',
      text: '假設每月供款不變、回報每年固定。薪金會加、供款率會跳級、基金有賺有蝕。這不是預測。',
    }),
  );
}

let staffList = [
  { id: 1, name: '同事 A', patternKey: 'cne8', anchorDate: '', anchorType: 0 },
];

function loadStaff() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STAFF_KEY) || '');
    if (Array.isArray(parsed) && parsed.length) staffList = parsed;
  } catch {
    /* keep default */
  }
}

function saveStaff() {
  localStorage.setItem(STAFF_KEY, JSON.stringify(staffList));
}

function renderStaffConfig() {
  const box = document.getElementById('staff-config');
  clearNode(box);
  staffList.forEach((staff) => {
    const nameInput = el('input', { type: 'text' });
    nameInput.value = staff.name;
    nameInput.addEventListener('input', () => {
      staff.name = nameInput.value;
      saveStaff();
      renderRoster();
    });
    const pattern = el('select');
    for (const [key, p] of Object.entries(SHIFT_PATTERNS)) {
      const opt = el('option', { value: key, text: p.name });
      if (key === staff.patternKey) opt.selected = true;
      pattern.append(opt);
    }
    const type = el('select');
    const fillTypes = () => {
      clearNode(type);
      const pat = SHIFT_PATTERNS[staff.patternKey] || SHIFT_PATTERNS.cne8;
      pat.shifts.forEach((s, i) => {
        const opt = el('option', { value: String(i), text: `這天是：${s.name}` });
        if (i === Number(staff.anchorType)) opt.selected = true;
        type.append(opt);
      });
      if (Number(staff.anchorType) >= pat.shifts.length) staff.anchorType = 0;
    };
    fillTypes();
    pattern.addEventListener('change', () => {
      staff.patternKey = pattern.value;
      staff.anchorType = 0;
      fillTypes();
      saveStaff();
      renderRoster();
    });
    const date = el('input', { type: 'date' });
    date.value = staff.anchorDate || localISODate();
    staff.anchorDate = date.value;
    date.addEventListener('change', () => {
      staff.anchorDate = date.value;
      saveStaff();
      renderRoster();
    });
    type.addEventListener('change', () => {
      staff.anchorType = Number(type.value) || 0;
      saveStaff();
      renderRoster();
    });
    const del = el('button', { class: 'btn-ghost', type: 'button', text: '刪' });
    del.addEventListener('click', () => {
      staffList = staffList.filter((s) => s.id !== staff.id);
      saveStaff();
      renderShift();
    });
    box.append(
      el(
        'div',
        { class: 'staff-card' },
        labeled('姓名', nameInput),
        labeled('更期', pattern),
        labeled('已知一天的日期', date),
        labeled('那天更種', type),
        del,
      ),
    );
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
  const today = localISODate();
  const table = el('table');
  const head = el('tr', {}, el('th', { text: '日' }), el('th', { text: '星期' }));
  staffList.forEach((s) => head.append(el('th', { text: s.name || '（未命名）' })));
  table.append(el('thead', {}, head));
  const tbody = el('tbody');
  days.forEach((d) => {
    const iso = localISODate(d);
    const tr = el('tr', { class: iso === today ? 'today' : '' });
    tr.append(el('th', { text: String(d.getDate()) }), el('th', { text: WEEKDAYS[d.getDay()] }));
    staffList.forEach((s) => {
      const cell = shiftOnDate(s, d);
      tr.append(el('td', { class: cell.kind, text: cell.name }));
    });
    tbody.append(tr);
  });
  table.append(tbody);
  box.append(table);
}

function copyRoster() {
  const monthVal = document.getElementById('shift-month').value || localYearMonth();
  const [ys, ms] = monthVal.split('-');
  const text = rosterToText(staffList, Number(ys), Number(ms));
  copyText(text, '已複製更表');
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
  const copyBtn = el('button', { class: 'btn-ghost', type: 'button', text: '複製紀錄' });
  copyBtn.addEventListener('click', () => copyText(formatDrawRecord(record), '已複製抽假紀錄'));
  box.append(el('div', { class: 'actions' }, copyBtn));
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
  const useMeals = document.getElementById('eq-meals-on').checked;
  const r = splitEquipmentWindow({
    startClock: eqStartClock,
    endClock: eqEndClock,
    staffCount: document.getElementById('eq-n').value,
    breaks: useMeals
      ? mealRows.map((row) => ({
          label: row.label,
          windowStart: row.windowStart,
          windowEnd: row.windowEnd,
        }))
      : [],
  });
  const box = document.getElementById('eq-result');
  clearNode(box);
  box.classList.remove('hidden');
  if (r.error) {
    box.append(el('p', { class: 'bad', text: r.error }));
    return;
  }
  if (r.workTotalMins != null && r.workTotalMins !== r.totalDurationMins) {
    box.append(
      el('p', {
        text: `當更 ${r.totalDurationMins} 分鐘，固定時段 ${r.totalDurationMins - r.workTotalMins} 分鐘，裝備 ${r.workTotalMins} 分鐘，每人 ${r.perPersonMins} 分鐘。`,
      }),
    );
  }
  const list = el('div', { class: 'tl' });
  r.slots.forEach((s) => {
    const isMeal = s.kind === 'meal';
    const title = isMeal ? s.label : s.letter;
    list.append(
      el(
        'div',
        { class: isMeal ? 'tl-item meal' : 'tl-item duty' },
        el('span', { class: 'tl-time', text: `${s.start} – ${s.end}` }),
        el('span', { class: 'tl-who', text: title }),
        el('span', { class: 'tl-mins', text: `${s.minutes} 分鐘` }),
      ),
    );
  });
  box.append(list);
  if (r.totals) {
    const parts = Object.entries(r.totals).map(([k, v]) => `${k} ${v} 分鐘`);
    box.append(el('p', { class: 'hint', text: `裝備合計：${parts.join(' · ')}` }));
  }
  const text = r.slots
    .map((s) => `${s.start}–${s.end}　${s.kind === 'meal' ? s.label : s.letter}　${s.minutes}分鐘`)
    .join('\n');
  const copyBtn = el('button', { class: 'btn-ghost', type: 'button', text: '複製時間表' });
  copyBtn.addEventListener('click', () => copyText(text, '已複製時間表'));
  box.append(el('div', { class: 'actions' }, copyBtn));
}

let eqStartClock = '08:10';
let eqEndClock = '16:00';

let mealRows = [
  {
    id: 1,
    label: '午餐',
    windowStart: '12:00',
    windowEnd: '13:00',
  },
];
let mealSeq = mealRows.length;

function parseClockParts(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '').trim());
  if (!m) return { h: 12, min: 0 };
  return { h: Number(m[1]), min: Number(m[2]) };
}

function joinClock(h, min) {
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function snapStep(n, step) {
  const x = Math.round(Number(n) / step) * step;
  if (!Number.isFinite(x)) return 0;
  return Math.min(60 - step, Math.max(0, x));
}

function time24(clock, onChange, step = 5) {
  const parsed = parseClockParts(clock);
  const hour = el('select', { class: 'time-h' });
  for (let i = 0; i < 24; i += 1) {
    const opt = el('option', { value: String(i), text: String(i).padStart(2, '0') });
    if (i === parsed.h) opt.selected = true;
    hour.append(opt);
  }
  const minute = el('select', { class: 'time-m' });
  const snapped = step === 1 ? parsed.min : snapStep(parsed.min, step);
  for (let i = 0; i < 60; i += step) {
    const opt = el('option', { value: String(i), text: String(i).padStart(2, '0') });
    if (i === snapped) opt.selected = true;
    minute.append(opt);
  }
  const sync = () => onChange(joinClock(Number(hour.value), Number(minute.value)));
  hour.addEventListener('change', sync);
  minute.addEventListener('change', sync);
  if (snapped !== parsed.min) sync();
  return el('div', { class: 'time-24' }, hour, el('span', { class: 'time-colon', text: ':' }), minute);
}

function renderShiftClocks() {
  const startBox = document.getElementById('eq-start-box');
  const endBox = document.getElementById('eq-end-box');
  if (!startBox || !endBox) return;
  clearNode(startBox);
  clearNode(endBox);
  startBox.append(time24(eqStartClock, (v) => { eqStartClock = v; }, 1));
  endBox.append(time24(eqEndClock, (v) => { eqEndClock = v; }, 1));
}

function renderMealRows() {
  const box = document.getElementById('eq-meals-list');
  clearNode(box);
  mealRows.forEach((row) => {
    const label = el('input', { type: 'text', placeholder: '例如 午餐' });
    label.value = row.label;
    label.addEventListener('input', () => {
      row.label = label.value;
    });
    const del = el('button', {
      class: 'btn-ghost btn-icon',
      type: 'button',
      title: '刪除',
    });
    del.setAttribute('aria-label', '刪除');
    del.textContent = '×';
    del.addEventListener('click', () => {
      mealRows = mealRows.filter((x) => x.id !== row.id);
      renderMealRows();
    });
    const wrap = el('div', { class: 'meal-row' });
    wrap.append(
      labeled('名稱', label),
      labeled('由', time24(row.windowStart, (v) => { row.windowStart = v; }, 5)),
      labeled('至', time24(row.windowEnd, (v) => { row.windowEnd = v; }, 5)),
      del,
    );
    box.append(wrap);
  });
}

function labeled(text, control) {
  return el('div', {}, el('label', { text }), control);
}

function toggleMealsBox() {
  const on = document.getElementById('eq-meals-on').checked;
  document.getElementById('eq-meals-box').classList.toggle('hidden', !on);
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
  document.querySelectorAll('[data-retire]').forEach((b) => {
    b.addEventListener('click', () => showRetire(b.dataset.retire));
  });
  document.getElementById('cspf-form').addEventListener('submit', onCspf);
  document.getElementById('cspf-proj-form').addEventListener('submit', onCspfProj);
  ['cspf-fund-scheme', 'cspf-fund-kind', 'cspf-fund-q'].forEach((id) => {
    document.getElementById(id).addEventListener('input', renderCspfFundTable);
    document.getElementById(id).addEventListener('change', renderCspfFundTable);
  });
  renderCspfSchemes();
  document.getElementById('shift-month').addEventListener('change', renderRoster);
  document.getElementById('add-staff').addEventListener('click', () => {
    staffList.push({
      id: Date.now(),
      name: `同事 ${String.fromCharCode(65 + staffList.length)}`,
      patternKey: 'cne8',
      anchorDate: localISODate(),
      anchorType: 0,
    });
    saveStaff();
    renderShift();
  });
  const copyRosterBtn = document.getElementById('copy-roster');
  if (copyRosterBtn) copyRosterBtn.addEventListener('click', copyRoster);
  const printRosterBtn = document.getElementById('print-roster');
  if (printRosterBtn) printRosterBtn.addEventListener('click', () => window.print());
  document.getElementById('draw-form').addEventListener('submit', onDraw);
  document.getElementById('draw-new').addEventListener('click', () => {
    sessionStorage.removeItem(LAST_DRAW_KEY);
    document.getElementById('draw-result').classList.add('hidden');
  });
  document.getElementById('eq-form').addEventListener('submit', onEquipment);
  document.getElementById('eq-meals-on').addEventListener('change', toggleMealsBox);
  document.getElementById('eq-add-meal').addEventListener('click', () => {
    mealSeq += 1;
    mealRows.push({
      id: mealSeq,
      label: '',
      windowStart: '15:00',
      windowEnd: '16:00',
    });
    renderMealRows();
  });
  renderShiftClocks();
  renderMealRows();
  toggleMealsBox();
  document.getElementById('q-form').addEventListener('submit', onQuarters);
  document.getElementById('d-date').value = localISODate();
  document.getElementById('q-deadline').value = localISODate();
  loadStaff();
  window.addEventListener('hashchange', applyHash);
  applyHash();
}

init();
