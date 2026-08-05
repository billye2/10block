# Changelog

Versioning is an odometer: each component counts 0–9 and carries into the next
(1.3.9 → 1.4.0, 1.9.9 → 2.0.0). Cut releases with `npm run release`.

## [1.3.2] - 2026-08-04

Rebrand for discoverability — no behavior changes.

- Renamed to **Block Site for 10 Minutes: Stop Doomscrolling** (manifest `name`, 45 chars —
  the store title updates when this version is published). Keyword-carrying manifest
  description and toolbar tooltip. The popup wordmark and countdown-page title now read
  "Block Site" instead of "10block".
- Redesigned icon: still the red stop-sign octagon with a white "10", now drawn from an
  SVG source (`src/icons/icon.svg`) with a red gradient, rounded corners, and cleaner
  digits; a simplified variant keeps 16px legible. `scripts/gen-icons.mjs`
  (`@resvg/resvg-js`) replaces `scripts/make_icons.py`.
- Promo tile and marquee redrawn in the PDF Mana house style (coral gradient, white
  rounded tile with the mark) by the new `scripts/promo.mjs`; `marketing/stage/tiles.html`
  retired. Screenshots and promo video regenerated with the new icon.
- Store listing copy rewritten around search keywords (website blocker, stop
  doomscrolling, focus) in `docs/STORE_LISTING.md`.

## [1.3.1] - 2026-07-31

- Request `declarativeNetRequestWithHostAccess` instead of `declarativeNetRequest`.
  Behaviour is identical — `<all_urls>` is still declared, so every rule action works
  exactly as before — but it drops a redundant install-time permission warning. All 11
  e2e tests pass unchanged.
- Chrome Web Store submission package: store icon, 5 screenshots, small and marquee promo
  tiles, and a 31-second promo video, all generated from the real extension stylesheets
  (`npm run assets`). Listing copy, per-permission justifications, and a privacy policy.

## [1.3.0] - 2026-07-31

First packaged release.

- Block the current site with one click per duration — 10, 30, or 60 minutes, no typing
- Full-page countdown page with a 4-second box-breathing guide (inhale · hold · exhale · hold)
- "+10" button in the Paused right now list extends a block by 10 minutes, capped at 60 remaining
- Blocks cover all subdomains and survive tab closes and browser restarts
- No early-unblock — that's the point
- Stop-sign "10" icon and matching popup logo
- Playwright e2e suite (11 tests) driving the real extension in Chromium
