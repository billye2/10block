# Store assets

Everything the Chrome Web Store listing needs, generated from `stage/`.

```sh
npm run assets          # rebuild every asset in store/
```

Or one group at a time:

```sh
node marketing/capture.mjs shots    # the 5 screenshots
node marketing/capture.mjs video    # the 31s promo
node marketing/capture.mjs verify   # scene stills, into .tmp/ — check before recording
node scripts/promo.mjs              # small + marquee promo tiles (SVG → PNG)
node scripts/gen-icons.mjs --store marketing/store/store-icon-128.png
```

## What's in `store/`

| File | Size | Where it goes |
| --- | --- | --- |
| `store-icon-128.png` | 128×128 | Store listing icon (96px mark on a 128px canvas) |
| `screenshot-1.png` … `-5.png` | 1280×800 | Screenshots — 5 is the maximum the store accepts |
| `promo-tile-440x280.png` | 440×280 | Small promo tile |
| `marquee-1400x560.png` | 1400×560 | Marquee promo tile |
| `promo-video-1280x800.webm` | 1280×800, 31s | Upload to YouTube, then paste the URL in the listing |

Screenshot order is the pitch: **two clicks → the countdown → breathing → +10 →
no early unblock**.

## How it's built

`stage/popup-frame.html` and `stage/blocked-frame.html` are the popup and the
countdown page rendered from **`src/popup.css` and `src/blocked.css` directly** —
not copies. The mark in every asset is `src/icons/icon128.png`, and the store
icon comes out of `scripts/gen-icons.mjs`, the same generator that produces the
shipped icons (design source: `src/icons/icon.svg`). Nothing here can drift from
the real UI without the assets changing too.

The promo tiles are the exception: `scripts/promo.mjs` draws them as SVG
(coral-gradient background, white rounded tile holding the mark — the PDF Mana
house style) and rasterises with `@resvg/resvg-js`, no browser involved.

`capture.mjs` serves the repo over a local HTTP server (so the stage pages and
the real stylesheets are same-origin), drives Playwright's Chromium, and:

- renders stills at **2× and downscales with `sips`**, which antialiases text
  much better than rasterising straight to the target size;
- records the promo as one continuous take.

### The promo timeline

`stage/promo.html` is a single 31-second take. Every animated element runs one
animation whose duration is the **whole 31s**, with its own keyframe
percentages — no `animation-delay` anywhere — so all layers stay frame-locked to
one clock and scenes can't drift apart.

```
A  0.0- 3.5s   logo
B  3.5-10.0s   browser, cursor to the toolbar icon, popup, click block
C 10.0-20.0s   countdown page, live breathing ring
D 20.0-25.5s   the paused list, +10 press, 7:12 -> 17:12
E 25.5-31.0s   end card
```

Cursor targets aren't hard-coded: the page measures the real toolbar icon,
block button, and `+10` button and injects the keyframes, so the cursor still
lands correctly if the popup layout changes.

`verify` seeks that shared clock with the Web Animations API and screenshots
individual instants — use it to check composition without waiting out a
31-second recording.

## Video format

Playwright's bundled ffmpeg only encodes **VP8/WebM**, so the promo is a `.webm`.
YouTube accepts WebM and re-encodes on upload, which is the only place this file
needs to go.

If you want an H.264 master as well, install ffmpeg and convert:

```sh
brew install ffmpeg
ffmpeg -i marketing/store/promo-video-1280x800.webm \
  -c:v libx264 -pix_fmt yuv420p -crf 18 -preset slow -movflags +faststart \
  marketing/store/promo-video-1280x800.mp4
```

## Before uploading

- Listing copy and privacy paperwork are done: `docs/STORE_LISTING.md`,
  `docs/privacy-practices-copy.md`, and `10block-PRIVACY.md` (published at
  `https://github.com/billye2/pdfxtn/blob/main/docs/10block-PRIVACY.md`).
- Upload `release/10block-1.3.1.zip` (not 1.3.0 — it's superseded).
- `<all_urls>` has already been flagged by the dashboard, and the decision is to
  **keep it**. The justification is written; see `docs/privacy-practices-copy.md`
  and the reasoning in `HANDOFF.md`. Expect a slower first review.
- No screenshot uses a third-party logo or brand colour — domains appear as
  plain text in an address bar only, which is what the extension actually does.
