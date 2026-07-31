// 10block — popup

const main = document.getElementById('main');
const listSection = document.getElementById('blocked-list-section');
const list = document.getElementById('blocked-list');

// Two-part public suffixes we're likely to hit; used by the eTLD+1 heuristic.
const TWO_PART_SUFFIXES = new Set([
  'co.uk', 'org.uk', 'ac.uk', 'gov.uk', 'me.uk', 'net.uk',
  'com.au', 'net.au', 'org.au', 'edu.au', 'gov.au',
  'co.jp', 'ne.jp', 'or.jp', 'ac.jp', 'go.jp',
  'co.nz', 'net.nz', 'org.nz',
  'co.in', 'net.in', 'org.in', 'gen.in', 'firm.in', 'ind.in',
  'com.br', 'net.br', 'org.br',
  'co.kr', 'or.kr', 'ne.kr',
  'com.mx', 'org.mx', 'net.mx',
  'com.cn', 'net.cn', 'org.cn',
  'com.tw', 'org.tw', 'net.tw',
  'co.za', 'org.za', 'net.za',
  'com.sg', 'org.sg', 'net.sg',
  'co.id', 'com.ar', 'com.tr', 'com.hk', 'com.my', 'com.ph', 'com.vn'
]);

// "music.youtube.com" -> "youtube.com", "news.bbc.co.uk" -> "bbc.co.uk".
// Blocking the registrable domain means the ||domain^ rule covers every subdomain.
function registrableDomain(hostname) {
  // IP addresses (v4 or bracketless v6) are used as-is.
  if (/^[\d.]+$/.test(hostname) || hostname.includes(':')) return hostname;
  const labels = hostname.split('.').filter(Boolean);
  if (labels.length <= 2) return hostname;
  const lastTwo = labels.slice(-2).join('.');
  const take = TWO_PART_SUFFIXES.has(lastTwo) ? 3 : 2;
  return labels.slice(-take).join('.');
}

const MAX_REMAINING_MS = 60 * 60 * 1000; // "+10" cap, mirrors background.js

function formatRemaining(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

async function getBlocked() {
  const { blocked = {} } = await chrome.storage.local.get('blocked');
  // Ignore entries the alarm hasn't cleaned up yet.
  const now = Date.now();
  return Object.fromEntries(
    Object.entries(blocked).filter(([, e]) => e.expiry > now)
  );
}

function renderBlockButton(domain, tabId) {
  main.innerHTML = '';

  async function doBlock(minutes) {
    for (const b of main.querySelectorAll('button')) b.disabled = true;
    await chrome.runtime.sendMessage({ type: 'block', domain, tabId, minutes });
    window.close();
  }

  // Primary: 10 minutes, one click.
  const btn = document.createElement('button');
  btn.className = 'block-btn';
  btn.dataset.minutes = '10';

  const domainEl = document.createElement('span');
  domainEl.className = 'domain';
  domainEl.textContent = `Block ${domain}`;

  const sub = document.createElement('span');
  sub.className = 'sub';
  sub.textContent = 'for 10 minutes';

  btn.append(domainEl, sub);
  btn.addEventListener('click', () => doBlock(10));

  // Longer durations, also one click each.
  const alts = document.createElement('div');
  alts.className = 'alt-durations';
  for (const m of [30, 60]) {
    const alt = document.createElement('button');
    alt.className = 'alt-btn';
    alt.dataset.minutes = String(m);
    alt.textContent = `${m} minutes`;
    alt.addEventListener('click', () => doBlock(m));
    alts.appendChild(alt);
  }

  main.append(btn, alts);
}

function renderStatusCard({ domain, expiry, note }) {
  main.innerHTML = '';
  const card = document.createElement('div');
  card.className = 'status-card';

  if (domain) {
    const domainEl = document.createElement('div');
    domainEl.className = 'domain';
    domainEl.textContent = domain;
    card.appendChild(domainEl);
  }

  if (expiry) {
    const remaining = document.createElement('div');
    remaining.className = 'remaining';
    remaining.dataset.expiry = String(expiry);
    remaining.textContent = formatRemaining(expiry - Date.now());
    card.appendChild(remaining);
  }

  const noteEl = document.createElement('div');
  noteEl.className = 'note';
  noteEl.textContent = note;
  card.appendChild(noteEl);

  main.appendChild(card);
}

function renderBlockedList(blocked, currentDomain) {
  const entries = Object.entries(blocked)
    .filter(([domain]) => domain !== currentDomain)
    .sort(([, a], [, b]) => a.expiry - b.expiry);

  if (entries.length === 0) {
    listSection.hidden = true;
    return;
  }

  listSection.hidden = false;
  list.innerHTML = '';
  for (const [domain, entry] of entries) {
    const li = document.createElement('li');

    const site = document.createElement('span');
    site.className = 'site';
    site.textContent = domain;

    const time = document.createElement('span');
    time.className = 'time';
    time.dataset.expiry = String(entry.expiry);
    time.textContent = formatRemaining(entry.expiry - Date.now());

    // "+10": extend this block by 10 minutes (remaining time caps at 60).
    const extendBtn = document.createElement('button');
    extendBtn.className = 'extend-btn';
    extendBtn.textContent = '+10';
    extendBtn.title = 'Add 10 more minutes (max 60)';
    // Disable within a minute of the cap, where "+10" would gain almost nothing.
    extendBtn.disabled = entry.expiry - Date.now() > MAX_REMAINING_MS - 60_000;
    extendBtn.addEventListener('click', async () => {
      extendBtn.disabled = true;
      await chrome.runtime.sendMessage({ type: 'extend', domain });
      init(); // re-render with the new expiry
    });

    li.append(site, time, extendBtn);
    list.appendChild(li);
  }
}

// Tick every element carrying a data-expiry attribute.
function startTicker() {
  setInterval(() => {
    const now = Date.now();
    for (const el of document.querySelectorAll('[data-expiry]')) {
      const remaining = Number(el.dataset.expiry) - now;
      el.textContent = formatRemaining(remaining);
      if (remaining <= 0) {
        // Timer just hit zero while the popup was open — re-render.
        init();
        return;
      }
    }
  }, 250);
}

async function getTargetTab() {
  // e2e hook: tests open popup.html?tabId=N in a tab, where the real popup
  // anchors to the active tab of the current window.
  const override = new URLSearchParams(location.search).get('tabId');
  if (override) {
    return chrome.tabs.get(Number(override));
  }
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function init() {
  const tab = await getTargetTab();
  const blocked = await getBlocked();

  let currentDomain = null;
  let url = null;
  try {
    url = tab && tab.url ? new URL(tab.url) : null;
  } catch {
    url = null;
  }

  if (url && (url.protocol === 'http:' || url.protocol === 'https:')) {
    currentDomain = registrableDomain(url.hostname);
  } else if (url && url.protocol === 'chrome-extension:' && url.pathname === '/blocked.html') {
    // Popup opened while looking at our own countdown page.
    currentDomain = new URLSearchParams(url.search).get('domain');
  }

  if (!currentDomain) {
    renderStatusCard({ note: 'Nothing to block here.' });
  } else if (blocked[currentDomain]) {
    renderStatusCard({
      domain: currentDomain,
      expiry: blocked[currentDomain].expiry,
      note: 'Paused. Hang in there.'
    });
  } else {
    renderBlockButton(currentDomain, tab.id);
  }

  renderBlockedList(blocked, currentDomain);
}

init();
startTicker();
