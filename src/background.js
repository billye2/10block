// 10block — service worker
// State lives in chrome.storage.local under the "blocked" key:
//   { [domain]: { expiry: <ms timestamp>, ruleId: <int> } }
// One declarativeNetRequest dynamic rule + one alarm per blocked domain.

const DURATION_CHOICES_MIN = [10, 30, 60];
const DEFAULT_DURATION_MIN = 10;
const EXTEND_MS = 10 * 60 * 1000;        // "+10" adds 10 minutes…
const MAX_REMAINING_MS = 60 * 60 * 1000; // …but remaining time never exceeds 60.
const ALARM_PREFIX = 'unblock:';

function durationMs(minutes) {
  const m = DURATION_CHOICES_MIN.includes(minutes) ? minutes : DEFAULT_DURATION_MIN;
  return m * 60 * 1000;
}

// Stable positive 32-bit rule id from a domain (FNV-1a).
function ruleIdForDomain(domain) {
  let h = 0x811c9dc5;
  for (let i = 0; i < domain.length; i++) {
    h ^= domain.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 1) + 1; // 1 .. 2^31, never 0
}

async function getBlocked() {
  const { blocked = {} } = await chrome.storage.local.get('blocked');
  return blocked;
}

async function setBlocked(blocked) {
  await chrome.storage.local.set({ blocked });
}

async function block(domain, minutes) {
  const blocked = await getBlocked();
  // Already blocked and not expired: never reset the timer.
  if (blocked[domain] && blocked[domain].expiry > Date.now()) {
    return blocked[domain];
  }

  const ruleId = ruleIdForDomain(domain);
  const expiry = Date.now() + durationMs(minutes);

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [ruleId], // idempotent
    addRules: [
      {
        id: ruleId,
        priority: 1,
        action: {
          type: 'redirect',
          redirect: {
            extensionPath: `/blocked.html?domain=${encodeURIComponent(domain)}`
          }
        },
        condition: {
          urlFilter: `||${domain}^`,
          resourceTypes: ['main_frame']
        }
      }
    ]
  });

  blocked[domain] = { expiry, ruleId };
  await setBlocked(blocked);
  chrome.alarms.create(ALARM_PREFIX + domain, { when: expiry });
  return blocked[domain];
}

async function unblock(domain) {
  const blocked = await getBlocked();
  const entry = blocked[domain];
  const ruleId = entry ? entry.ruleId : ruleIdForDomain(domain);

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: [ruleId]
  });

  if (entry) {
    delete blocked[domain];
    await setBlocked(blocked);
  }
  await chrome.alarms.clear(ALARM_PREFIX + domain);
}

// Add 10 minutes to an active block, capping remaining time at 60 minutes.
async function extend(domain) {
  const blocked = await getBlocked();
  const entry = blocked[domain];
  if (!entry || entry.expiry <= Date.now()) return null;

  entry.expiry = Math.min(entry.expiry + EXTEND_MS, Date.now() + MAX_REMAINING_MS);
  await setBlocked(blocked);
  chrome.alarms.create(ALARM_PREFIX + domain, { when: entry.expiry }); // replaces old alarm
  return entry;
}

// Unblock only if the timer has actually expired. Returns true if unblocked.
async function unblockIfExpired(domain) {
  const blocked = await getBlocked();
  const entry = blocked[domain];
  if (!entry || entry.expiry <= Date.now()) {
    await unblock(domain);
    return true;
  }
  return false;
}

// Reconcile rules/alarms with storage. Runs at browser startup and on install,
// and covers alarms that should have fired while Chrome was closed.
async function sweep() {
  const blocked = await getBlocked();
  const now = Date.now();
  const validRuleIds = new Set();

  for (const [domain, entry] of Object.entries(blocked)) {
    if (entry.expiry <= now) {
      await unblock(domain);
    } else {
      validRuleIds.add(entry.ruleId);
      // Alarms persist across restarts, but recreate to be safe.
      chrome.alarms.create(ALARM_PREFIX + domain, { when: entry.expiry });
    }
  }

  // Drop any dynamic rules that no longer have a storage entry.
  const rules = await chrome.declarativeNetRequest.getDynamicRules();
  const orphaned = rules.filter((r) => !validRuleIds.has(r.id)).map((r) => r.id);
  if (orphaned.length > 0) {
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: orphaned });
  }
}

chrome.runtime.onStartup.addListener(sweep);
chrome.runtime.onInstalled.addListener(sweep);

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name.startsWith(ALARM_PREFIX)) {
    unblock(alarm.name.slice(ALARM_PREFIX.length));
  }
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    if (msg.type === 'block') {
      await block(msg.domain, msg.minutes);
      // DNR rules only apply to new navigations — redirect the current tab now.
      if (msg.tabId != null) {
        await chrome.tabs.update(msg.tabId, {
          url: chrome.runtime.getURL(`blocked.html?domain=${encodeURIComponent(msg.domain)}`)
        });
      }
      sendResponse({ ok: true });
    } else if (msg.type === 'extend') {
      const entry = await extend(msg.domain);
      sendResponse({ ok: true, entry });
    } else if (msg.type === 'unblockIfExpired') {
      const unblocked = await unblockIfExpired(msg.domain);
      sendResponse({ ok: true, unblocked });
    } else {
      sendResponse({ ok: false, error: 'unknown message' });
    }
  })();
  return true; // async response
});
