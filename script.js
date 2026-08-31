const STORAGE_KEY = 'adp-board-vibes-values';

let allPlayers = [];
let currentSort = { key: 'adp_cbs', dir: 'asc' };
let filters = { flaggedOnly: false, valueOnly: false, overratedOnly: false, search: '', position: 'ALL' };

function loadVibesValues() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch (e) {
    return {};
  }
}

function saveVibesValue(playerKey, value) {
  const stored = loadVibesValues();
  if (value.trim() === '') {
    delete stored[playerKey];
  } else {
    stored[playerKey] = value;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
}

function playerKey(p) {
  return `${p.player}__${p.team}`;
}

async function init() {
  const res = await fetch('data.json');
  const data = await res.json();
  const vibes = loadVibesValues();
  allPlayers = data.map(p => ({
    ...p,
    vibes_value: vibes[playerKey(p)] || ''
  }));

  document.getElementById('stat-total').textContent = allPlayers.length;
  document.getElementById('stat-flagged').textContent = allPlayers.filter(p => p.flagged).length;
  document.getElementById('stat-value').textContent = allPlayers.filter(p => p.value_flag).length;
  document.getElementById('stat-overrated').textContent = allPlayers.filter(p => p.overrated_flag).length;

  render();
  bindControls();
}

function updateStats() {
  const scoped = filters.position === 'ALL'
    ? allPlayers
    : allPlayers.filter(p => p.position === filters.position);
  document.getElementById('stat-total').textContent = scoped.length;
  document.getElementById('stat-flagged').textContent = scoped.filter(p => p.flagged).length;
  document.getElementById('stat-value').textContent = scoped.filter(p => p.value_flag).length;
  document.getElementById('stat-overrated').textContent = scoped.filter(p => p.overrated_flag).length;
}

function bindControls() {
  document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.sort;
      setSort(key);
      document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  document.querySelectorAll('th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const key = th.dataset.sort;
      setSort(key);
      document.querySelectorAll('.sort-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.sort === key);
      });
    });
  });

  document.getElementById('filter-flagged').addEventListener('change', (e) => {
    filters.flaggedOnly = e.target.checked;
    render();
  });

  document.getElementById('filter-value').addEventListener('change', (e) => {
    filters.valueOnly = e.target.checked;
    render();
  });

  document.getElementById('filter-overrated').addEventListener('change', (e) => {
    filters.overratedOnly = e.target.checked;
    render();
  });

  document.getElementById('search-box').addEventListener('input', (e) => {
    filters.search = e.target.value.toLowerCase();
    render();
  });

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      filters.position = btn.dataset.pos;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updateStats();
      render();
    });
  });
}

function setSort(key) {
  if (currentSort.key === key) {
    currentSort.dir = currentSort.dir === 'asc' ? 'desc' : 'asc';
  } else {
    currentSort = { key, dir: 'asc' };
  }
  render();
}

function getFiltered() {
  let list = allPlayers.slice();

  if (filters.flaggedOnly) list = list.filter(p => p.flagged);
  if (filters.valueOnly) list = list.filter(p => p.value_flag);
  if (filters.overratedOnly) list = list.filter(p => p.overrated_flag);
  if (filters.position !== 'ALL') list = list.filter(p => p.position === filters.position);
  if (filters.search) {
    list = list.filter(p => p.player.toLowerCase().includes(filters.search));
  }

  list.sort((a, b) => {
    const av = a[currentSort.key];
    const bv = b[currentSort.key];
    const cmp = (av < bv) ? -1 : (av > bv) ? 1 : 0;
    return currentSort.dir === 'asc' ? cmp : -cmp;
  });

  return list;
}

function render() {
  const list = getFiltered();
  const tbody = document.getElementById('table-body');
  const emptyState = document.getElementById('empty-state');

  tbody.innerHTML = '';

  if (list.length === 0) {
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;

  list.forEach(p => {
    const tr = document.createElement('tr');
    tr.className = p.value_flag ? 'value-row' : (p.overrated_flag ? 'overrated-row' : (p.flagged ? 'flagged-row' : ''));

    const posDiffClass = p.flagged ? 'pos-diff-badge flagged' : 'pos-diff-badge';

    tr.innerHTML = `
      <td class="col-player">${escapeHtml(p.player)}</td>
      <td class="col-team">${escapeHtml(p.team)}</td>
      <td class="col-pos">${escapeHtml(p.position)}</td>
      <td class="col-num">${p.adp_cbs}</td>
      <td class="col-posrank">${escapeHtml(p.pos_rank_cbs)}</td>
      <td class="col-num">${p.adp_underdog}</td>
      <td class="col-posrank">${escapeHtml(p.pos_rank_underdog)}</td>
      <td class="col-num"><span class="${posDiffClass}">${p.pos_rank_diff}</span></td>
      <td class="col-flag">${p.value_flag ? '<span class="value-badge">&#9679; Value</span>' : ''}</td>
      <td class="col-flag">${p.overrated_flag ? '<span class="overrated-badge">&#9679; Overrated</span>' : ''}</td>
      <td class="col-vibes">
        <input type="text" class="vibes-input" placeholder="Add a take…"
               data-key="${escapeHtml(playerKey(p))}" value="${escapeHtml(p.vibes_value)}">
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('.vibes-input').forEach(input => {
    input.addEventListener('input', (e) => {
      const key = e.target.dataset.key;
      saveVibesValue(key, e.target.value);
      const player = allPlayers.find(p => playerKey(p) === key);
      if (player) player.vibes_value = e.target.value;
    });
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

init();
