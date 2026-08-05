# 10block

Block the current website for 10, 30, or 60 minutes. Enough time to change your mind about that YouTube spiral or Reddit scroll.

Published on the [Chrome Web Store](https://chromewebstore.google.com/detail/anhnjohpkkanlmfcblfopicnmkednlla) as **Block Site for 10 Minutes: Stop Doomscrolling** (10block stays the repo/dev name; the in-product wordmark is "Block Site").

- **2 clicks, zero typing** — the site to block is read from the tab you're on.
- Visiting a blocked site shows a calm full-page countdown instead, with a 4-second box-breathing guide.
- Extend a running block by 10 minutes with **+10**, up to 60 minutes.
- Auto-unblocks when the timer hits 0:00 and sends you back to the site.
- No early-unblock button. That's the point.

## Install

Easiest: [install from the Chrome Web Store](https://chromewebstore.google.com/detail/anhnjohpkkanlmfcblfopicnmkednlla).

For development:

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode** (toggle, top right).
3. Click **Load unpacked** and select the `src/` folder.

Or install a packaged release zip from `release/`.

Optionally pin the extension to the toolbar (puzzle-piece icon → pin) so it's always one click away.

## Use

1. On the site you want to escape, click the **Block Site** stop-sign icon.
2. Click **Block youtube.com — for 10 minutes**.

Want longer? **30 minutes** and **60 minutes** buttons sit right below — every duration is a single click.

Each entry in the **Paused right now** list has a **+10** button — one click adds 10 more minutes to that block, capped at 60 minutes remaining.

The tab flips to a countdown page, and any visit to the site (including subdomains like `m.youtube.com` or `music.youtube.com`) redirects there until the timer runs out. The popup also lists everything currently paused with time remaining.

The countdown page paces a 4-second box-breathing cycle while you wait — **inhale · hold · exhale · hold**, with the ring expanding and contracting in time.

Blocks survive closing the popup, the tab, and even restarting Chrome.

## How it works

- `declarativeNetRequest` dynamic rules redirect `main_frame` navigations for the blocked domain (and its subdomains) to `blocked.html`.
- `chrome.storage.local` stores each domain's absolute expiry timestamp — the popup, countdown page, and background all count down against the same clock.
- `chrome.alarms` removes the rule exactly at expiry; a startup sweep cleans up anything that expired while Chrome was closed.

The extension requests `<all_urls>` because the domain to block isn't known until you click — it's whatever site you're on. Worth knowing: `block` rules need no host access at all, but 10block uses a `redirect` rule so it can show its own countdown page rather than a browser error page, and `redirect` is the action that requires host access. Full reasoning in [docs/privacy-practices-copy.md](docs/privacy-practices-copy.md).

## Project layout

```
src/                the extension itself (manifest, popup, blocked page, icons) — load this folder unpacked
tests/              Playwright e2e suite
scripts/            release.mjs (two-phase release), gen-icons.mjs (icons), promo.mjs (promo tiles)
release/            versioned zips: 10block-X.Y.Z.zip
marketing/          Web Store artwork and the generator that builds it (npm run assets)
docs/               store listing copy and per-permission justifications
10block-PRIVACY.md  privacy policy
CHANGELOG.md        one section per version; the release script requires it
HANDOFF.md          project state, key mechanics, and open items
```

## Releases

Two-phase flow, cut from `main`:

```sh
# 1. Write the changelog: add a "## [X.Y.Z]" section for the NEXT version.
# 2. Cut the release — bump version, zip src/, "Release vX.Y.Z" commit + tag:
npm run release
# 3. Review the commit, then push + create the GitHub release (zip attached):
npm run release:publish
```

Escape hatches: `npm run release -- --zip-only` (bump + zip, no git), `npm run release -- --no-bump` (re-zip current version, no git).

The version is an odometer — each component counts 0–9 and carries into the next: `1.3.0 → 1.3.1 … 1.3.9 → 1.4.0`, `1.9.9 → 2.0.0`. The script keeps `package.json` and `src/manifest.json` in sync and refuses to cut a release without its changelog entry.

## Tests

Playwright e2e tests drive the full flow (popup → block → countdown → auto-unblock) in a real Chromium with the extension loaded, against a local HTTP server:

```sh
npm install
npx playwright install chromium
npm test
```

## Icons

The stop-sign mark lives in `scripts/gen-icons.mjs`, which writes the design source `src/icons/icon.svg` and rasterizes it with `@resvg/resvg-js` (a simplified fat-digit variant keeps 16px legible):

```sh
npm run icons
```

The popup logo renders `src/icons/icon48.png` directly, so the popup mark and the toolbar icon can never drift apart.

## Store assets

Everything the Chrome Web Store listing needs — the 128px icon, five 1280×800 screenshots, both promo tiles, and a 31-second promo video — is generated, not hand-designed:

```sh
npm run assets
```

The generator renders the popup and countdown page from `src/popup.css` and `src/blocked.css` directly, and the store icon comes out of `scripts/gen-icons.mjs`, so the artwork can't drift from the shipped UI. The promo tiles are drawn as SVG by `scripts/promo.mjs` in the PDF Mana coral style. Change the palette, re-run one command, and every asset follows. See [marketing/README.md](marketing/README.md).

Listing copy, per-permission justifications, and the pre-submit checklist live in [docs/STORE_LISTING.md](docs/STORE_LISTING.md).

## Picking this up

See [HANDOFF.md](HANDOFF.md) for current state, the mechanics worth knowing before changing `background.js`, and open items (Web Store submission, palette cleanup).
