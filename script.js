/* ============================================
   Penny Pouch 🐷 – script
   All data is saved in the browser (localStorage).
   ============================================ */
(() => {
  'use strict';

  /* ---------- settings you can tweak ---------- */
  const CURRENCY = '₹';          // change to $ or € etc.
  const PDF_CURRENCY = 'Rs.';    // PDFs can't draw ₹ in the default font
  const STORE_KEY = 'penny-pouch-v1';

  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  const MON = MONTHS.map(m => m.slice(0, 3));

  const BASE_CATS = [
    { id: 'food',     emoji: '🍜', label: 'Food',          color: '#ffb38a' },
    { id: 'clothing', emoji: '👗', label: 'Clothing',      color: '#ff9ec7' },
    { id: 'college',  emoji: '📚', label: 'College',       color: '#9ab8ff' },
    { id: 'beauty',   emoji: '💄', label: 'Beauty & Care', color: '#d3a6ff' },
    { id: 'travel',   emoji: '🚌', label: 'Travel',        color: '#7fd6c2' },
    { id: 'fun',      emoji: '🎬', label: 'Fun & Outings', color: '#ffd966' },
    { id: 'gifts',    emoji: '🎁', label: 'Gifts',         color: '#ff8f8f' },
    { id: 'health',   emoji: '💊', label: 'Health',        color: '#8fd9a8' },
    { id: 'bills',    emoji: '📱', label: 'Bills & Subs',  color: '#a5c4d4' },
    { id: 'others',   emoji: '✨', label: 'Others',        color: '#c9b8a8' }
  ];
  const EXTRA_COLORS = ['#f7a8b8', '#a8e6cf', '#b5a8f7', '#f7d6a8', '#a8d8f7', '#e6a8f7'];
  const DEFAULT_PLAN = {
    food: 30, clothing: 10, college: 20, beauty: 10, travel: 10,
    fun: 10, gifts: 3, health: 2, bills: 3, others: 2
  };

  /* ---------- tiny helpers ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const pad = n => String(n).padStart(2, '0');
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const esc = s => String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const sum = list => list.reduce((t, e) => t + e.amount, 0);
  const money = n => CURRENCY + Number(n || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 0, maximumFractionDigits: 2
  });
  const num2 = n => Number(n || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  });
  const toISO = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const todayISO = () => toISO(new Date());
  const mk = (y, m) => `${y}-${pad(m + 1)}`;
  const daysIn = (y, m) => new Date(y, m + 1, 0).getDate();

  /* ---------- state ---------- */
  const defaultState = () => ({
    name: '',
    expenses: [],
    budgets: {},
    lastBudget: 0,
    plan: { ...DEFAULT_PLAN },
    noSpend: [],
    customCats: []
  });

  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(STORE_KEY));
      if (s && typeof s === 'object') return Object.assign(defaultState(), s);
    } catch (e) { /* ignore */ }
    return defaultState();
  }

  let state = load();
  const now = new Date();
  let view = { y: now.getFullYear(), m: now.getMonth() };
  let histYear = view.y;
  let editingId = null;
  let showAll = false;
  const charts = {};

  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch (e) {
      toast('Could not save on this browser 😢');
    }
  }

  const allCats = () => BASE_CATS.concat(state.customCats);
  const catById = id => allCats().find(c => c.id === id) || BASE_CATS[BASE_CATS.length - 1];
  const monthExpenses = key => state.expenses.filter(e => e.date.startsWith(key));

  function getBudget(key) {
    if (state.budgets[key] != null) return { amount: state.budgets[key], carried: false };
    const currentKey = mk(now.getFullYear(), now.getMonth());
    if (state.lastBudget > 0 && key >= currentKey) return { amount: state.lastBudget, carried: true };
    return { amount: 0, carried: false };
  }

  function byCategory(list) {
    const map = {};
    list.forEach(e => { map[e.cat] = (map[e.cat] || 0) + e.amount; });
    return Object.entries(map)
      .map(([id, total]) => ({ cat: catById(id), total }))
      .sort((a, b) => b.total - a.total);
  }

  /* ---------- toast ---------- */
  let toastTimer;
  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
  }

  /* ============================================
     RENDERING
     ============================================ */
  function render() {
    renderGreeting();
    renderCatSelects();
    renderSummary();
    renderPlan();
    renderCharts();
    renderList();
    renderHistory();
  }

  function renderGreeting() {
    $('#greet').textContent = `Hi, ${state.name || 'cutie'}! 💕`;
    document.querySelectorAll('.cur').forEach(el => { el.textContent = CURRENCY; });
  }

  function renderCatSelects() {
    const cats = allCats();
    const catSel = $('#cat');
    const prevCat = catSel.value || 'food';
    catSel.innerHTML = cats.map(c => `<option value="${esc(c.id)}">${c.emoji} ${esc(c.label)}</option>`).join('');
    catSel.value = cats.some(c => c.id === prevCat) ? prevCat : 'food';

    const fSel = $('#filterCat');
    const prevF = fSel.value || 'all';
    fSel.innerHTML = '<option value="all">All categories</option>' +
      cats.map(c => `<option value="${esc(c.id)}">${c.emoji} ${esc(c.label)}</option>`).join('');
    fSel.value = (prevF === 'all' || cats.some(c => c.id === prevF)) ? prevF : 'all';
  }

  function renderSummary() {
    const key = mk(view.y, view.m);
    const list = monthExpenses(key);
    const total = sum(list);
    const b = getBudget(key);
    const budget = b.amount;
    const dim = daysIn(view.y, view.m);
    const curKey = mk(now.getFullYear(), now.getMonth());
    const isCurrent = key === curKey;
    const isPast = key < curKey;
    const today = now.getDate();
    const daysLeft = isCurrent ? dim - today + 1 : (isPast ? 0 : dim);
    const elapsed = isCurrent ? today : (isPast ? dim : 0);
    const remaining = budget - total;
    const pct = budget > 0 ? (total / budget) * 100 : 0;

    $('#monthLabel').textContent = `${MONTHS[view.m]} ${view.y}`;
    $('#thisMonth').hidden = isCurrent;
    $('#totalSpent').textContent = money(total);

    $('#budgetLine').textContent = budget > 0
      ? `of your ${money(budget)} budget${b.carried ? ' (carried over from last time)' : ''}`
      : 'no budget set for this month yet';

    const fill = $('#heroBar');
    fill.style.width = Math.min(pct, 100) + '%';
    fill.className = 'fill' + (pct > 100 ? ' over' : pct >= 80 ? ' warn' : '');
    $('.bar').setAttribute('aria-valuenow', Math.round(Math.min(pct, 100)));

    // mood + pig face
    let mood, face;
    if (budget <= 0) {
      mood = 'Set a budget and I\'ll help you plan the month! 🎯';
      face = '🤔';
    } else if (pct > 100) {
      mood = 'Oops, we crossed the budget 🙈 Let\'s go gentle for the rest of the month.';
      face = '😱';
    } else if (pct >= 80) {
      mood = 'Almost at the limit! Only the must-haves from here 🧸';
      face = '😳';
    } else if (isCurrent && total > budget * (today / dim) * 1.15) {
      mood = 'A little ahead of pace, maybe slow down a bit 🐢';
      face = '😅';
    } else if (total === 0) {
      mood = 'A fresh, empty month. Let\'s make it a good one ✨';
      face = '😊';
    } else {
      mood = 'You\'re doing amazing, sweetie! Keep it up 🌷';
      face = '🥰';
    }
    $('#mood').textContent = mood;
    $('#pigFace').textContent = face;

    // stat cards
    const top = byCategory(list)[0];
    const noSpendDays = state.noSpend.filter(d =>
      d.startsWith(key) && !list.some(e => e.date === d)).length;
    const allowance = (budget > 0 && daysLeft > 0) ? Math.max(remaining, 0) / daysLeft : 0;
    const stats = [
      {
        e: '🎈', t: remaining >= 0 ? 'Left to spend' : 'Over budget by',
        v: budget > 0 ? money(Math.abs(remaining)) : '—',
        s: budget > 0 ? `${Math.round(Math.min(pct, 999))}% used` : 'set a budget'
      },
      {
        e: '🗓️', t: 'You can spend',
        v: (budget > 0 && daysLeft > 0) ? money(Math.round(allowance)) + '/day' : '—',
        s: daysLeft > 0 ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} left` : 'month is over'
      },
      {
        e: '☀️', t: 'Average per day',
        v: elapsed > 0 ? money(Math.round(total / elapsed)) : '—',
        s: `over ${elapsed} day${elapsed === 1 ? '' : 's'}`
      },
      {
        e: top ? top.cat.emoji : '🏆', t: 'Top category',
        v: top ? esc(top.cat.label) : '—',
        s: top ? money(top.total) : 'nothing yet'
      },
      {
        e: '🎉', t: 'No-spend days',
        v: String(noSpendDays),
        s: 'days you spent nothing'
      },
      {
        e: '🧾', t: 'Entries',
        v: String(list.length),
        s: 'this month'
      }
    ];
    $('#stats').innerHTML = stats.map(s => `
      <div class="stat">
        <div class="s-top">${s.e} ${s.t}</div>
        <div class="s-val">${s.v}</div>
        <div class="s-sub">${s.s}</div>
      </div>`).join('');
  }

  function planAmounts(budget) {
    const cats = allCats();
    const totalPct = cats.reduce((t, c) => t + (Number(state.plan[c.id]) || 0), 0);
    const out = {};
    cats.forEach(c => {
      out[c.id] = (budget > 0 && totalPct > 0)
        ? budget * (Number(state.plan[c.id]) || 0) / totalPct : 0;
    });
    return out;
  }

  function renderPlan() {
    const key = mk(view.y, view.m);
    const list = monthExpenses(key);
    const budget = getBudget(key).amount;
    const spentMap = {};
    list.forEach(e => { spentMap[e.cat] = (spentMap[e.cat] || 0) + e.amount; });

    if (budget <= 0) {
      $('#planSub').textContent = 'Set a monthly budget and I\'ll split it across your categories 🍰';
      $('#planList').innerHTML = '<div class="empty">No budget yet 🌱<br><small>tap "Set / change budget" at the top</small></div>';
      return;
    }
    $('#planSub').textContent = `Your ${money(budget)} budget, planned out. Tap "Set / change budget" to reshape it.`;
    const planned = planAmounts(budget);
    const rows = allCats()
      .filter(c => planned[c.id] > 0 || spentMap[c.id] > 0)
      .map(c => {
        const sp = spentMap[c.id] || 0;
        const pl = planned[c.id];
        const p = pl > 0 ? (sp / pl) * 100 : (sp > 0 ? 100 : 0);
        const over = sp > pl;
        return `
          <div class="plan-row ${over ? 'over' : ''}">
            <div class="p-top">
              <span>${c.emoji} ${esc(c.label)}</span>
              <span>${money(sp)} / ${money(Math.round(pl))}${over ? ' 🙈' : ''}</span>
            </div>
            <div class="mini-bar"><div data-w="${Math.round(Math.min(p, 100))}" style="width:${Math.min(p, 100)}%;background:${c.color}"></div></div>
          </div>`;
      });
    $('#planList').innerHTML = rows.join('') || '<div class="empty">Nothing planned</div>';
  }

  /* ---------- charts ---------- */
  function chartsReady() { return typeof Chart !== 'undefined'; }

  function renderCharts() {
    const key = mk(view.y, view.m);
    const list = monthExpenses(key);
    const cats = byCategory(list);
    const total = sum(list);

    $('#catEmpty').hidden = cats.length > 0;
    $('.chart-box.donut').hidden = cats.length === 0;
    $('#catLegend').innerHTML = cats.map(c => `
      <li>
        <span class="dot" style="background:${c.cat.color}"></span>
        <span class="l-name">${c.cat.emoji} ${esc(c.cat.label)}</span>
        <span class="l-val">${money(c.total)} · ${Math.round(c.total / total * 100)}%</span>
      </li>`).join('');

    if (!chartsReady()) {
      $('#catEmpty').hidden = false;
      $('#catEmpty').innerHTML = 'Charts need internet to load 🌐<br><small>everything else still works!</small>';
      return;
    }

    Chart.defaults.font.family = "'Gaegu', cursive";
    Chart.defaults.font.size = 15;
    Chart.defaults.color = '#4a3b78';

    // doughnut
    if (charts.cat) charts.cat.destroy();
    if (cats.length) {
      charts.cat = new Chart($('#catChart'), {
        type: 'doughnut',
        data: {
          labels: cats.map(c => c.cat.label),
          datasets: [{
            data: cats.map(c => c.total),
            backgroundColor: cats.map(c => c.cat.color),
            borderColor: '#4a3b78',
            borderWidth: 3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '55%',
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${money(ctx.parsed)}` } }
          }
        }
      });
    }

    // daily bars
    const dim = daysIn(view.y, view.m);
    const daily = Array(dim).fill(0);
    list.forEach(e => { daily[Number(e.date.slice(8, 10)) - 1] += e.amount; });
    if (charts.day) charts.day.destroy();
    charts.day = new Chart($('#dayChart'), {
      type: 'bar',
      data: {
        labels: daily.map((_, i) => i + 1),
        datasets: [{
          data: daily,
          backgroundColor: '#d9c8ff',
          borderColor: '#4a3b78',
          borderWidth: 2,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: items => `${items[0].label} ${MON[view.m]}`,
              label: ctx => ` ${money(ctx.parsed.y)}`
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { maxTicksLimit: 10 } },
          y: { beginAtZero: true, ticks: { callback: v => CURRENCY + v } }
        }
      }
    });
  }

  /* ---------- list ---------- */
  function renderList() {
    const key = mk(view.y, view.m);
    const filter = $('#filterCat').value;
    let list = monthExpenses(key);
    if (filter !== 'all') list = list.filter(e => e.cat === filter);
    list.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));

    const box = $('#expList');
    if (!list.length) {
      box.innerHTML = '<div class="empty">No spendings here yet 🐣<br><small>your tiny piggy is waiting…</small></div>';
      return;
    }
    const LIMIT = 30;
    const shown = showAll ? list : list.slice(0, LIMIT);
    box.innerHTML = shown.map(e => {
      const c = catById(e.cat);
      const day = Number(e.date.slice(8, 10));
      return `
        <div class="exp">
          <div class="d">${day}<small>${MON[Number(e.date.slice(5, 7)) - 1]}</small></div>
          <div class="info">
            <span class="cat-pill" style="background:${c.color}">${c.emoji} ${esc(c.label)}</span>
            <div class="name">${e.item ? esc(e.item) : '<small>no note</small>'}</div>
          </div>
          <div class="amt">${money(e.amount)}</div>
          <div class="acts">
            <button class="icon-btn" data-edit="${esc(e.id)}" aria-label="Edit">✏️</button>
            <button class="icon-btn" data-del="${esc(e.id)}" aria-label="Delete">🗑️</button>
          </div>
        </div>`;
    }).join('') + (list.length > LIMIT && !showAll
      ? `<div class="list-more"><button class="btn mini" id="showMore" type="button">Show all ${list.length}</button></div>` : '');
  }

  /* ---------- history ---------- */
  function renderHistory() {
    // year dropdown
    const years = new Set(state.expenses.map(e => Number(e.date.slice(0, 4))));
    years.add(now.getFullYear());
    years.add(view.y);
    Object.keys(state.budgets).forEach(k => years.add(Number(k.slice(0, 4))));
    const ys = [...years].sort((a, b) => b - a);
    if (!ys.includes(histYear)) histYear = ys[0];
    const ySel = $('#histYear');
    ySel.innerHTML = ys.map(y => `<option value="${y}">${y}</option>`).join('');
    ySel.value = String(histYear);

    const yearList = state.expenses.filter(e => e.date.startsWith(String(histYear)));
    const yTotal = sum(yearList);
    const monthsActive = new Set(yearList.map(e => e.date.slice(0, 7))).size;
    const topCat = byCategory(yearList)[0];

    $('#yearStats').innerHTML = `
      <div class="stat"><div class="s-top">💰 Total in ${histYear}</div><div class="s-val">${money(yTotal)}</div></div>
      <div class="stat"><div class="s-top">📆 Monthly average</div><div class="s-val">${monthsActive ? money(Math.round(yTotal / monthsActive)) : '—'}</div></div>
      <div class="stat"><div class="s-top">${topCat ? topCat.cat.emoji : '🏆'} Top category</div><div class="s-val">${topCat ? esc(topCat.cat.label) : '—'}</div></div>`;

    const spent = [], budgets = [];
    let rows = `<div class="month-row head"><span>Month</span><span>Spent</span><span>Budget</span><span class="m-diff">Result</span><span class="m-go"></span></div>`;
    for (let m = 0; m < 12; m++) {
      const key = mk(histYear, m);
      const s = sum(monthExpenses(key));
      const bud = state.budgets[key];
      spent.push(s);
      budgets.push(bud != null ? bud : null);
      if (!s && bud == null) continue;
      let res = '<span class="m-diff">—</span>';
      if (bud != null && bud > 0) {
        const diff = bud - s;
        res = diff >= 0
          ? `<span class="m-diff good">saved ${money(diff)} 🎉</span>`
          : `<span class="m-diff bad">over ${money(-diff)} 🙈</span>`;
      }
      rows += `
        <div class="month-row">
          <span class="m-name">${MONTHS[m]}</span>
          <span>${money(s)}</span>
          <span>${bud != null ? money(bud) : '—'}</span>
          ${res}
          <span class="m-go"><button class="icon-btn" data-go="${histYear}-${m}">open ›</button></span>
        </div>`;
    }
    $('#monthRows').innerHTML = (yearList.length || budgets.some(b => b != null))
      ? rows : '<div class="empty">Nothing recorded in this year 🌙</div>';

    // all years chips
    const totals = {};
    state.expenses.forEach(e => {
      const y = e.date.slice(0, 4);
      totals[y] = (totals[y] || 0) + e.amount;
    });
    const yk = Object.keys(totals).sort((a, b) => b - a);
    $('#yearChips').innerHTML = yk.length
      ? yk.map(y => `<button class="chip" data-year="${y}">${y}: ${money(totals[y])}</button>`).join('')
      : '<span class="sub">Your yearly totals will show up here ☁️</span>';

    // chart
    if (!chartsReady()) { $('.chart-box.hist').hidden = true; return; }
    $('.chart-box.hist').hidden = false;
    if (charts.hist) charts.hist.destroy();
    charts.hist = new Chart($('#histChart'), {
      data: {
        labels: MON,
        datasets: [
          {
            type: 'bar',
            label: 'Spent',
            data: spent,
            backgroundColor: '#b9f0dc',
            borderColor: '#4a3b78',
            borderWidth: 2,
            borderRadius: 6,
            order: 2
          },
          {
            type: 'line',
            label: 'Budget',
            data: budgets,
            borderColor: '#ff8fa8',
            backgroundColor: '#ff8fa8',
            borderWidth: 3,
            borderDash: [6, 5],
            pointRadius: 4,
            spanGaps: false,
            order: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { usePointStyle: true } },
          tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${money(ctx.parsed.y)}` } }
        },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true, ticks: { callback: v => CURRENCY + v } }
        }
      }
    });
  }

  /* ============================================
     ACTIONS
     ============================================ */

  /* ----- month navigation ----- */
  function setView(y, m) {
    view = { y, m };
    histYear = y;
    showAll = false;
    render();
  }
  $('#prevMonth').addEventListener('click', () => {
    const d = new Date(view.y, view.m - 1, 1);
    setView(d.getFullYear(), d.getMonth());
  });
  $('#nextMonth').addEventListener('click', () => {
    const d = new Date(view.y, view.m + 1, 1);
    setView(d.getFullYear(), d.getMonth());
  });
  $('#thisMonth').addEventListener('click', () => setView(now.getFullYear(), now.getMonth()));

  /* ----- add / edit expense ----- */
  function resetForm() {
    editingId = null;
    $('#amount').value = '';
    $('#item').value = '';
    $('#saveBtn').textContent = 'Save it 💕';
    $('#cancelEdit').hidden = true;
  }

  $('#expForm').addEventListener('submit', ev => {
    ev.preventDefault();
    const amt = parseFloat($('#amount').value);
    if (!(amt > 0)) { toast('Please enter an amount above 0 🐷'); return; }
    const date = $('#date').value || todayISO();
    const rec = {
      id: editingId || uid(),
      date,
      amount: Math.round(amt * 100) / 100,
      cat: $('#cat').value,
      item: $('#item').value.trim().slice(0, 80)
    };
    if (editingId) {
      const i = state.expenses.findIndex(e => e.id === editingId);
      if (i >= 0) state.expenses[i] = rec; else state.expenses.push(rec);
    } else {
      state.expenses.push(rec);
    }
    state.noSpend = state.noSpend.filter(d => d !== date);
    const wasEditing = !!editingId;
    save();
    resetForm();
    view = { y: Number(date.slice(0, 4)), m: Number(date.slice(5, 7)) - 1 };
    histYear = view.y;
    render();
    toast(wasEditing ? 'Updated! ✏️💕' : 'Saved! 🐷💕');
  });

  $('#cancelEdit').addEventListener('click', resetForm);

  $('#expList').addEventListener('click', ev => {
    const edit = ev.target.closest('[data-edit]');
    const del = ev.target.closest('[data-del]');
    if (ev.target.id === 'showMore') { showAll = true; renderList(); return; }
    if (edit) {
      const e = state.expenses.find(x => x.id === edit.dataset.edit);
      if (!e) return;
      editingId = e.id;
      $('#date').value = e.date;
      $('#amount').value = e.amount;
      $('#cat').value = e.cat;
      $('#item').value = e.item || '';
      $('#saveBtn').textContent = 'Update ✏️';
      $('#cancelEdit').hidden = false;
      $('#add').scrollIntoView({ behavior: 'smooth', block: 'start' });
      $('#amount').focus({ preventScroll: true });
    }
    if (del) {
      if (!confirm('Delete this entry?')) return;
      state.expenses = state.expenses.filter(x => x.id !== del.dataset.del);
      if (editingId === del.dataset.del) resetForm();
      save();
      render();
      toast('Deleted 🗑️');
    }
  });

  $('#filterCat').addEventListener('change', () => { showAll = false; renderList(); });

  /* ----- history interactions ----- */
  $('#histYear').addEventListener('change', e => { histYear = Number(e.target.value); renderHistory(); });
  $('#monthRows').addEventListener('click', ev => {
    const b = ev.target.closest('[data-go]');
    if (!b) return;
    const [y, m] = b.dataset.go.split('-').map(Number);
    setView(y, m);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  $('#yearChips').addEventListener('click', ev => {
    const b = ev.target.closest('[data-year]');
    if (!b) return;
    histYear = Number(b.dataset.year);
    renderHistory();
  });

  /* ----- name dialog ----- */
  const nameDlg = $('#nameDialog');
  $('#greet').addEventListener('click', () => {
    $('#nameInput').value = state.name;
    nameDlg.showModal();
  });
  $('#nameForm').addEventListener('submit', () => {
    state.name = $('#nameInput').value.trim().slice(0, 24);
    save();
    renderGreeting();
  });
  nameDlg.addEventListener('close', maybeAskDaily);

  /* ----- daily prompt ----- */
  let asked = false;
  function maybeAskDaily() {
    if (asked) return;
    asked = true;
    const t = todayISO();
    let seen = false;
    try { seen = !!sessionStorage.getItem('pp-asked'); } catch (e) { /* ignore */ }
    if (seen) return;
    if (state.expenses.some(e => e.date === t) || state.noSpend.includes(t)) return;
    try { sessionStorage.setItem('pp-asked', '1'); } catch (e) { /* ignore */ }
    $('#dailyTitle').textContent = `Hey ${state.name || 'cutie'}! 💕`;
    $('#dailyDialog').showModal();
  }
  $('#dailyAdd').addEventListener('click', () => {
    $('#dailyDialog').close();
    setView(now.getFullYear(), now.getMonth());
    $('#date').value = todayISO();
    $('#add').scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => $('#amount').focus({ preventScroll: true }), 400);
  });
  $('#dailyNone').addEventListener('click', () => {
    const t = todayISO();
    if (!state.noSpend.includes(t)) state.noSpend.push(t);
    save();
    $('#dailyDialog').close();
    render();
    toast('A no-spend day, so proud of you! 🎉');
  });
  $('#dailyLater').addEventListener('click', () => $('#dailyDialog').close());

  /* ----- budget dialog ----- */
  const budgetDlg = $('#budgetDialog');

  function updatePlanTotal() {
    const total = [...document.querySelectorAll('#planInputs input')]
      .reduce((t, i) => t + (parseFloat(i.value) || 0), 0);
    $('#planTotal').textContent = `Total: ${Math.round(total * 10) / 10}%` +
      (Math.round(total) === 100 ? ' ✨' : ' (I\'ll balance it to 100%)');
  }

  $('#openBudget').addEventListener('click', () => {
    const key = mk(view.y, view.m);
    $('#budgetTitle').textContent = `${MONTHS[view.m]} ${view.y} budget`;
    $('#budgetInput').value = getBudget(key).amount || '';
    $('#planInputs').innerHTML = allCats().map(c => `
      <label><span>${c.emoji} ${esc(c.label)}</span>
        <input type="number" min="0" max="100" step="1" data-cat="${esc(c.id)}" value="${Number(state.plan[c.id]) || 0}">%
      </label>`).join('');
    updatePlanTotal();
    budgetDlg.showModal();
  });
  $('#planInputs').addEventListener('input', updatePlanTotal);
  $('#budgetCancel').addEventListener('click', () => budgetDlg.close());
  $('#budgetForm').addEventListener('submit', () => {
    const amount = parseFloat($('#budgetInput').value);
    const key = mk(view.y, view.m);
    const vals = {};
    document.querySelectorAll('#planInputs input').forEach(i => {
      vals[i.dataset.cat] = Math.max(0, parseFloat(i.value) || 0);
    });
    const total = Object.values(vals).reduce((a, b) => a + b, 0);
    if (total > 0) {
      Object.keys(vals).forEach(k => { vals[k] = Math.round(vals[k] / total * 1000) / 10; });
      state.plan = vals;
    }
    if (amount > 0) {
      state.budgets[key] = amount;
      state.lastBudget = amount;
    } else {
      delete state.budgets[key];
    }
    save();
    render();
    toast(amount > 0 ? 'Budget saved! 🎯💕' : 'Budget cleared');
  });

  /* ----- new category dialog ----- */
  const catDlg = $('#catDialog');
  $('#addCat').addEventListener('click', () => {
    $('#catEmoji').value = '';
    $('#catName').value = '';
    catDlg.showModal();
  });
  $('#catCancel').addEventListener('click', () => catDlg.close());
  $('#catForm').addEventListener('submit', () => {
    const label = $('#catName').value.trim().slice(0, 20);
    const emoji = $('#catEmoji').value.trim() || '🌸';
    if (!label) return;
    const id = 'c-' + uid();
    const color = EXTRA_COLORS[state.customCats.length % EXTRA_COLORS.length];
    state.customCats.push({ id, emoji, label, color });
    state.plan[id] = 0;
    save();
    renderCatSelects();
    $('#cat').value = id;
    render();
    $('#cat').value = id;
    toast(`Added ${emoji} ${label}!`);
  });

  /* ============================================
     PDF EXPORT
     ============================================ */
  const pdfSafe = s => String(s || '').replace(/[^\x20-\x7E\u00A0-\u00FF]/g, '').trim();
  const fmtDMY = iso => `${iso.slice(8, 10)}-${iso.slice(5, 7)}-${iso.slice(0, 4)}`;

  $('#pdfBtn').addEventListener('click', () => {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      toast('PDF tool did not load. Check your internet 🌐');
      return;
    }
    const scope = $('#pdfScope').value;
    let list, title, slug, budgetText = '';
    if (scope === 'month') {
      const key = mk(view.y, view.m);
      list = monthExpenses(key);
      title = `${MONTHS[view.m]} ${view.y}`;
      slug = key;
      const b = getBudget(key).amount;
      if (b > 0) budgetText = `   |   Budget: ${PDF_CURRENCY} ${num2(b)}`;
    } else if (scope === 'year') {
      list = state.expenses.filter(e => e.date.startsWith(String(histYear)));
      title = `Year ${histYear}`;
      slug = String(histYear);
    } else {
      list = state.expenses.slice();
      title = 'All time';
      slug = 'all';
    }
    if (!list.length) { toast('Nothing to download yet 🐣'); return; }
    list.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();
    const total = sum(list);

    // header band
    doc.setFillColor(241, 234, 255);
    doc.rect(0, 0, W, 36, 'F');
    doc.setTextColor(74, 59, 120);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('Penny Pouch - Expense Report', 14, 16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    const who = pdfSafe(state.name);
    doc.text(`${title}${who ? '   |   ' + who : ''}`, 14, 26);
    doc.setFontSize(11);
    doc.text(`Total spent: ${PDF_CURRENCY} ${num2(total)}   |   Entries: ${list.length}${budgetText}`, 14, 45);

    doc.autoTable({
      startY: 51,
      head: [['Date', 'Category', `Amount (${PDF_CURRENCY})`, 'Item']],
      body: list.map(e => [fmtDMY(e.date), pdfSafe(catById(e.cat).label) || 'Other', num2(e.amount), pdfSafe(e.item) || '-']),
      foot: [['', 'Total', num2(total), '']],
      showFoot: 'lastPage',
      styles: { fontSize: 10, textColor: [74, 59, 120], cellPadding: 2.5 },
      headStyles: { fillColor: [155, 127, 224], textColor: 255 },
      footStyles: { fillColor: [255, 240, 168], textColor: [74, 59, 120] },
      alternateRowStyles: { fillColor: [250, 246, 255] },
      columnStyles: { 0: { cellWidth: 28 }, 1: { cellWidth: 40 }, 2: { halign: 'right', cellWidth: 36 } }
    });

    // category summary
    let y = doc.lastAutoTable.finalY + 12;
    if (y > H - 60) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Spending by category', 14, y);
    doc.autoTable({
      startY: y + 4,
      head: [['Category', `Spent (${PDF_CURRENCY})`, 'Share']],
      body: byCategory(list).map(c => [
        pdfSafe(c.cat.label) || 'Other', num2(c.total), Math.round(c.total / total * 100) + '%'
      ]),
      styles: { fontSize: 10, textColor: [74, 59, 120] },
      headStyles: { fillColor: [127, 214, 194], textColor: [40, 60, 70] },
      alternateRowStyles: { fillColor: [244, 252, 249] },
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
      tableWidth: 110
    });

    // page numbers
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(125, 111, 168);
      doc.text(`Made with love in Penny Pouch   -   page ${i} of ${pages}`, W / 2, H - 8, { align: 'center' });
    }
    doc.save(`penny-pouch-${slug}.pdf`);
    toast('PDF downloaded! 📄✨');
  });

  /* ============================================
     BACKUP / RESTORE / CLEAR
     ============================================ */
  $('#exportBtn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `penny-pouch-backup-${todayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('Backup saved 💾');
  });

  $('#importBtn').addEventListener('click', () => $('#importFile').click());
  $('#importFile').addEventListener('change', ev => {
    const file = ev.target.files[0];
    ev.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data || !Array.isArray(data.expenses)) throw new Error('bad file');
        if (!confirm('This will replace everything currently on this device. Continue?')) return;
        state = Object.assign(defaultState(), data);
        save();
        render();
        toast('Restored! 💕');
      } catch (e) {
        toast('That file doesn\'t look like a Penny Pouch backup 🤔');
      }
    };
    reader.readAsText(file);
  });

  $('#wipeBtn').addEventListener('click', () => {
    if (!confirm('Delete ALL your data on this device?')) return;
    if (!confirm('Really sure? This cannot be undone (unless you have a backup).')) return;
    state = defaultState();
    save();
    resetForm();
    view = { y: now.getFullYear(), m: now.getMonth() };
    histYear = view.y;
    render();
    toast('All clean ✨');
  });

  /* ============================================
     START
     ============================================ */
  $('#date').value = todayISO();
  $('#date').max = todayISO();
  render();
  if (!state.name) {
    nameDlg.showModal();      // asks the daily question after it closes
  } else {
    maybeAskDaily();
  }
})();
