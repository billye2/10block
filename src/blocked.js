// 10block — countdown page. Reads ?domain=, counts down to the stored expiry,
// then returns to the site once the background has removed the block rule.

const domain = new URLSearchParams(location.search).get('domain');
const domainEl = document.getElementById('domain');
const timerEl = document.getElementById('timer');
const breathPhaseEl = document.getElementById('breath-phase');
const breathCountEl = document.getElementById('breath-count');

// Box breathing: 4s inhale, 4s hold, 4s exhale, 4s hold — a 16s cycle that
// matches the .breath-ring CSS animation (both start at page load).
const BREATH_PHASES = ['Inhale', 'Hold', 'Exhale', 'Hold'];
const PHASE_MS = 4000;
const breathStart = performance.now();

function updateBreath() {
  const t = (performance.now() - breathStart) % (BREATH_PHASES.length * PHASE_MS);
  breathPhaseEl.textContent = BREATH_PHASES[Math.floor(t / PHASE_MS)];
  breathCountEl.textContent = String(4 - Math.floor((t % PHASE_MS) / 1000));
}

setInterval(updateBreath, 100);
updateBreath();

function formatRemaining(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Ask the background to drop the rule (if truly expired), then go back.
let leaving = false;
async function returnToSite() {
  if (leaving) return;
  leaving = true;
  try {
    await chrome.runtime.sendMessage({ type: 'unblockIfExpired', domain });
  } catch {
    // Background unreachable — the alarm will have cleaned up anyway.
  }
  location.href = `https://${domain}`;
}

async function init() {
  if (!domain) {
    location.href = 'about:blank';
    return;
  }
  domainEl.textContent = domain;

  const { blocked = {} } = await chrome.storage.local.get('blocked');
  const entry = blocked[domain];
  if (!entry || entry.expiry <= Date.now()) {
    returnToSite();
    return;
  }

  let expiry = entry.expiry;
  // The block can be extended (+10 in the popup) while this page is open.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.blocked) {
      const updated = changes.blocked.newValue?.[domain];
      if (updated) expiry = updated.expiry;
    }
  });

  const tick = () => {
    const remaining = expiry - Date.now();
    timerEl.textContent = formatRemaining(remaining);
    if (remaining <= 0) {
      clearInterval(interval);
      returnToSite();
    }
  };
  const interval = setInterval(tick, 250);
  tick();
}

init();
