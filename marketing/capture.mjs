#!/usr/bin/env node
/**
 * Render the Chrome Web Store assets from marketing/stage/.
 *
 *   node marketing/capture.mjs            # everything
 *   node marketing/capture.mjs shots      # 5 screenshots (1280x800)
 *   node marketing/capture.mjs video      # 31s promo (webm)
 *   node marketing/capture.mjs verify     # scene stills from the promo timeline
 *
 * Promo tiles (small + marquee) are generated separately by scripts/promo.mjs.
 *
 * Stills are rendered at 2x and downscaled with lanczos, which antialiases text
 * far better than rasterising straight to the target size. The stage pages pull
 * src/popup.css and src/blocked.css directly, so the assets track the real UI.
 */
import { chromium } from '@playwright/test';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, mkdir, rm, readdir, rename } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'marketing', 'store');
const TMP = path.join(ROOT, 'marketing', '.tmp');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.json': 'application/json'
};

function serve() {
  const server = createServer(async (req, res) => {
    const rel = decodeURIComponent(req.url.split('?')[0]);
    const file = path.join(ROOT, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404).end('not found');
    }
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

const run = (cmd, args) =>
  new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => (err += d));
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} failed:\n${err}`))));
  });

/** Screenshot #id at 2x, then downscale to exactly w x h (sips -z is height, width). */
async function shoot(page, id, w, h, outName) {
  const raw = path.join(TMP, `${outName}.2x.png`);
  await page.locator(`#${id}`).screenshot({ path: raw, scale: 'device' });
  const out = path.join(OUT, outName);
  await run('sips', ['-z', String(h), String(w), raw, '--out', out]);
  console.log(`  ✓ ${outName}  ${w}x${h}`);
}

async function withPage(port, url, viewport, fn) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(`http://127.0.0.1:${port}${url}`, { waitUntil: 'load' });
  await page.waitForFunction(() => document.documentElement.dataset.ready === '1', null,
    { timeout: 15_000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  await fn(page);
  await browser.close();
}

async function shots(port) {
  console.log('screenshots (1280x800)');
  await withPage(port, '/marketing/stage/shots.html', { width: 1360, height: 900 }, async (page) => {
    for (let i = 1; i <= 5; i++) await shoot(page, `shot-${i}`, 1280, 800, `screenshot-${i}.png`);
  });
}

/** Stills along the promo timeline, so each scene can be checked before recording. */
async function verify(port) {
  console.log('promo scene stills');
  const marks = [1.6, 5.0, 6.2, 8.0, 9.2, 12.0, 17.0, 21.0, 23.0, 28.0];
  await withPage(port, '/marketing/stage/promo.html', { width: 1280, height: 800 }, async (page) => {
    for (const t of marks) {
      // Pin every animation on the page AND inside the iframes to the same instant.
      for (const f of [page.mainFrame(), ...page.frames().slice(1)]) {
        await f.evaluate((ms) => {
          for (const a of document.getAnimations()) {
            a.pause();
            a.currentTime = ms;
          }
        }, t * 1000).catch(() => {});
      }
      await page.waitForTimeout(120);
      const out = path.join(TMP, `promo-t${String(t).padStart(4, '0')}.png`);
      await page.locator('#video').screenshot({ path: out, scale: 'css' });
      console.log(`  ✓ t=${t}s`);
    }
  });
}

async function video(port) {
  console.log('promo video (31s)');
  await mkdir(TMP, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    recordVideo: { dir: TMP, size: { width: 1280, height: 800 } }
  });
  const page = await ctx.newPage();
  await page.goto(`http://127.0.0.1:${port}/marketing/stage/promo.html`, { waitUntil: 'load' });
  await page.waitForFunction(() => document.documentElement.dataset.ready === '1', null,
    { timeout: 15_000 });
  await page.waitForTimeout(31_400); // full 31s timeline + a beat of the end card
  const src = await page.video().path();
  await ctx.close();
  await browser.close();
  await rename(src, path.join(OUT, 'promo-video-1280x800.webm'));
  console.log('  ✓ promo-video-1280x800.webm  1280x800');
}

const targets = process.argv.slice(2);
// `verify` is a debugging target — only ever run when asked for by name.
const want = (t) => (targets.length === 0 ? t !== 'verify' : targets.includes(t));

const { server, port } = await serve();
await mkdir(OUT, { recursive: true });
await rm(TMP, { recursive: true, force: true });
await mkdir(TMP, { recursive: true });

if (want('shots')) await shots(port);
if (want('verify')) await verify(port);
if (want('video')) await video(port);

server.close();
console.log(`\noutput → ${path.relative(ROOT, OUT)}/`);
