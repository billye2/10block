# Changelog

Versioning is an odometer: each component counts 0–9 and carries into the next
(1.3.9 → 1.4.0, 1.9.9 → 2.0.0). Cut releases with `npm run release`.

## [1.3.0] - 2026-07-31

First packaged release.

- Block the current site with one click per duration — 10, 30, or 60 minutes, no typing
- Full-page countdown page with a 4-second box-breathing guide (inhale · hold · exhale · hold)
- "+10" button in the Paused right now list extends a block by 10 minutes, capped at 60 remaining
- Blocks cover all subdomains and survive tab closes and browser restarts
- No early-unblock — that's the point
- Stop-sign "10" icon and matching popup logo
- Playwright e2e suite (11 tests) driving the real extension in Chromium
