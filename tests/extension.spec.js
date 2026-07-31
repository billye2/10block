// e2e tests for 10block. Runs against a local HTTP server so no external
// network is needed. Chrome resolves *.localhost to 127.0.0.1, which gives us
// free "subdomains" (www.localhost) to verify subdomain blocking.
const http = require('http');
const { test, expect } = require('./fixtures');

const PORT = 8917;
const SITE = `http://localhost:${PORT}/`;
const SITE_SUBDOMAIN = `http://www.localhost:${PORT}/`;
const SITE_BY_IP = `http://127.0.0.1:${PORT}/`;

let server;

test.beforeAll(async () => {
  server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<!DOCTYPE html><title>Test Site</title><h1 id="hello">hello from the test site</h1>');
  });
  await new Promise((resolve) => server.listen(PORT, resolve));
});

test.afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

// ---- helpers ----------------------------------------------------------------

function blockedPageRe(extensionId) {
  return new RegExp(`^chrome-extension://${extensionId}/blocked\\.html`);
}

// tabs.query URL patterns can't express about:blank etc. — match in JS instead.
async function tabIdForUrl(serviceWorker, urlPrefix) {
  return serviceWorker.evaluate(async (prefix) => {
    const tabs = await chrome.tabs.query({});
    return tabs.find((t) => t.url && t.url.startsWith(prefix))?.id ?? null;
  }, urlPrefix);
}

async function getBlockedMap(serviceWorker) {
  return serviceWorker.evaluate(async () => {
    const { blocked = {} } = await chrome.storage.local.get('blocked');
    return blocked;
  });
}

async function getDynamicRules(serviceWorker) {
  return serviceWorker.evaluate(() => chrome.declarativeNetRequest.getDynamicRules());
}

// Open the real popup page anchored (via the ?tabId= e2e hook) to a given tab.
async function openPopup(context, extensionId, tabId) {
  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${extensionId}/popup.html?tabId=${tabId}`);
  return popup;
}

// Full user flow: visit a site, open the popup for that tab, click the block
// button for the wanted duration, and wait for the tab to land on the countdown
// page — which guarantees the background finished committing the block.
async function blockViaPopup(context, extensionId, serviceWorker, siteUrl, { minutes = 10 } = {}) {
  const page = await context.newPage();
  await page.goto(siteUrl);
  const tabId = await tabIdForUrl(serviceWorker, siteUrl);
  const popup = await openPopup(context, extensionId, tabId);
  await popup.locator(`button[data-minutes="${minutes}"]`).click();
  await page.waitForURL(blockedPageRe(extensionId));
  return { page, tabId };
}

// ---- tests ------------------------------------------------------------------

test('extension loads with no rules and no blocked sites', async ({ serviceWorker }) => {
  expect(await getDynamicRules(serviceWorker)).toEqual([]);
  expect(await getBlockedMap(serviceWorker)).toEqual({});
});

test('popup shows one-click block buttons for all three durations', async ({
  context, extensionId, serviceWorker
}) => {
  const page = await context.newPage();
  await page.goto(SITE);
  const tabId = await tabIdForUrl(serviceWorker, SITE);
  expect(tabId).not.toBeNull();

  const popup = await openPopup(context, extensionId, tabId);

  // Primary 10-minute button.
  const btn = popup.locator('.block-btn');
  await expect(btn).toBeVisible();
  await expect(btn).toHaveAttribute('data-minutes', '10');
  await expect(btn.locator('.domain')).toHaveText('Block localhost');
  await expect(btn.locator('.sub')).toHaveText('for 10 minutes');

  // 30 and 60 minutes are directly clickable too — no dropdown to open first.
  const alts = popup.locator('.alt-btn');
  await expect(alts).toHaveText(['30 minutes', '60 minutes']);
  await expect(alts.nth(0)).toBeVisible();
  await expect(alts.nth(1)).toBeVisible();
});

test('clicking block redirects the tab to a ~10:00 countdown page', async ({
  context, extensionId, serviceWorker
}) => {
  const { page } = await blockViaPopup(context, extensionId, serviceWorker, SITE);

  expect(page.url()).toBe(`chrome-extension://${extensionId}/blocked.html?domain=localhost`);
  await expect(page.locator('#domain')).toHaveText('localhost');
  await expect(page.locator('#timer')).toHaveText(/^(10:00|9:5\d)$/);
  await expect(page.locator('.message')).toHaveText('Take a breath. This site is paused.');

  // One dynamic rule + one storage entry exist for the domain.
  const rules = await getDynamicRules(serviceWorker);
  expect(rules).toHaveLength(1);
  expect(rules[0].condition.urlFilter).toBe('||localhost^');
  const blocked = await getBlockedMap(serviceWorker);
  expect(blocked.localhost.expiry).toBeGreaterThan(Date.now());
});

test('blocked page animates 4-second box breathing', async ({
  context, extensionId, serviceWorker
}) => {
  const { page } = await blockViaPopup(context, extensionId, serviceWorker, SITE);

  const phase = page.locator('#breath-phase');
  const count = page.locator('#breath-count');

  // Cycle starts on Inhale, counting 4 → 1 within each phase.
  await expect(phase).toHaveText('Inhale');
  await expect(count).toHaveText(/^[1-4]$/);

  // Each phase lasts 4s: Inhale → Hold → Exhale.
  await expect(phase).toHaveText('Hold', { timeout: 5000 });
  await expect(phase).toHaveText('Exhale', { timeout: 5000 });
});

test('clicking the 30-minute button blocks for 30 minutes', async ({
  context, extensionId, serviceWorker
}) => {
  const before = Date.now();
  const { page } = await blockViaPopup(context, extensionId, serviceWorker, SITE, { minutes: 30 });

  await expect(page.locator('#timer')).toHaveText(/^(30:00|29:5\d)$/);

  const { expiry } = (await getBlockedMap(serviceWorker)).localhost;
  expect(expiry).toBeGreaterThan(before + 29 * 60_000);
  expect(expiry).toBeLessThanOrEqual(Date.now() + 30 * 60_000);
});

test('new navigations to the domain and its subdomains are blocked', async ({
  context, extensionId, serviceWorker
}) => {
  await blockViaPopup(context, extensionId, serviceWorker, SITE);

  // Fresh tab, apex domain.
  const tab1 = await context.newPage();
  await tab1.goto(SITE);
  await tab1.waitForURL(blockedPageRe(extensionId));

  // Fresh tab, subdomain.
  const tab2 = await context.newPage();
  await tab2.goto(SITE_SUBDOMAIN);
  await tab2.waitForURL(blockedPageRe(extensionId));

  // A different site is untouched.
  const tab3 = await context.newPage();
  await tab3.goto(SITE_BY_IP);
  await expect(tab3.locator('#hello')).toHaveText('hello from the test site');
});

test('popup shows remaining time for a blocked site and lists other blocks', async ({
  context, extensionId, serviceWorker
}) => {
  const { tabId } = await blockViaPopup(context, extensionId, serviceWorker, SITE);

  // Popup for the blocked tab: status card with countdown, no block button.
  const popup1 = await openPopup(context, extensionId, tabId);
  await expect(popup1.locator('.status-card .domain')).toHaveText('localhost');
  await expect(popup1.locator('.status-card .remaining')).toHaveText(/^\d+:\d\d$/);
  await expect(popup1.locator('.block-btn')).toHaveCount(0);

  // Popup for a different site: block button for it + "localhost" in the list.
  const other = await context.newPage();
  await other.goto(SITE_BY_IP);
  const otherTabId = await tabIdForUrl(serviceWorker, SITE_BY_IP);
  const popup2 = await openPopup(context, extensionId, otherTabId);
  await expect(popup2.locator('.block-btn .domain')).toHaveText('Block 127.0.0.1');
  await expect(popup2.locator('#blocked-list li .site')).toHaveText('localhost');
  await expect(popup2.locator('#blocked-list li .time')).toHaveText(/^\d+:\d\d$/);
});

test('"+10" in the paused list extends the block, capped at 60 minutes', async ({
  context, extensionId, serviceWorker
}) => {
  await blockViaPopup(context, extensionId, serviceWorker, SITE); // localhost, 10 min

  // View the list from a popup anchored to a different site's tab.
  const other = await context.newPage();
  await other.goto(SITE_BY_IP);
  const otherTabId = await tabIdForUrl(serviceWorker, SITE_BY_IP);
  const popup = await openPopup(context, extensionId, otherTabId);

  const row = popup.locator('#blocked-list li');
  await expect(row.locator('.site')).toHaveText('localhost');
  const before = (await getBlockedMap(serviceWorker)).localhost.expiry;

  // One click adds exactly 10 minutes.
  await row.locator('.extend-btn').click();
  await expect(row.locator('.time')).toHaveText(/^(20:00|19:5\d)$/);
  const after = (await getBlockedMap(serviceWorker)).localhost.expiry;
  expect(after - before).toBe(10 * 60_000);

  // Hammer extend well past the cap — remaining time stays ≤ 60 minutes.
  for (let i = 0; i < 6; i++) {
    await popup.evaluate(() =>
      chrome.runtime.sendMessage({ type: 'extend', domain: 'localhost' })
    );
  }
  const capped = (await getBlockedMap(serviceWorker)).localhost.expiry;
  expect(capped).toBeLessThanOrEqual(Date.now() + 60 * 60_000);
  expect(capped).toBeGreaterThan(Date.now() + 59 * 60_000);

  // At the cap the button renders disabled.
  const popup2 = await openPopup(context, extensionId, otherTabId);
  await expect(popup2.locator('#blocked-list li .extend-btn')).toBeDisabled();
});

test('re-blocking an already-blocked site never resets the timer', async ({
  context, extensionId, serviceWorker
}) => {
  // The blocked page is an extension page — use it to fire direct messages.
  const { page } = await blockViaPopup(context, extensionId, serviceWorker, SITE);

  const before = (await getBlockedMap(serviceWorker)).localhost.expiry;
  // Even direct block messages (stronger than anything the UI allows) are no-ops.
  await page.evaluate(() => chrome.runtime.sendMessage({ type: 'block', domain: 'localhost' }));
  await page.evaluate(() =>
    chrome.runtime.sendMessage({ type: 'block', domain: 'localhost', minutes: 60 })
  );
  const after = (await getBlockedMap(serviceWorker)).localhost.expiry;
  expect(after).toBe(before);
});

test('popup on a non-web page says there is nothing to block', async ({
  context, extensionId, serviceWorker
}) => {
  // Create the tab from the service worker so we get its id directly.
  const tabId = await serviceWorker.evaluate(async () => {
    const tab = await chrome.tabs.create({ url: 'about:blank' });
    return tab.id;
  });
  expect(tabId).not.toBeNull();

  const popup = await openPopup(context, extensionId, tabId);
  await expect(popup.locator('.status-card .note')).toHaveText('Nothing to block here.');
  await expect(popup.locator('.block-btn')).toHaveCount(0);
});

test('when the timer expires the site unblocks and the page returns to it', async ({
  context, extensionId, serviceWorker
}) => {
  const { page } = await blockViaPopup(context, extensionId, serviceWorker, SITE);

  // Fast-forward: pull the stored expiry to ~2s from now.
  await serviceWorker.evaluate(async () => {
    const { blocked } = await chrome.storage.local.get('blocked');
    blocked.localhost.expiry = Date.now() + 2000;
    await chrome.storage.local.set({ blocked });
  });

  // Reload so the countdown picks up the shortened expiry, then let it hit 0:00.
  // The redirect target is https://localhost/, which refuses connections in the
  // test env — all that matters is that the page leaves the countdown.
  await page.reload();
  await expect
    .poll(() => page.url(), { timeout: 15_000 })
    .not.toMatch(/^chrome-extension:/);

  // Rule and storage entry are gone…
  await expect.poll(() => getDynamicRules(serviceWorker)).toEqual([]);
  expect(await getBlockedMap(serviceWorker)).toEqual({});

  // …and the site is reachable again.
  const fresh = await context.newPage();
  await fresh.goto(SITE);
  await expect(fresh.locator('#hello')).toHaveText('hello from the test site');
});
