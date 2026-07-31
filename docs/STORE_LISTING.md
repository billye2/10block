# Chrome Web Store — submission package

Everything to paste into the Developer Dashboard for 10block.

## Upload package

- **File:** `release/10block-<version>.zip` (built from `src/`, `manifest.json` at the zip root).
- Current: `release/10block-1.3.0.zip` — verified byte-identical to `src/`.
- (Re)package with **`npm run release`** (or `npm run release -- --no-bump` to re-zip the
  current version). The Web Store rejects re-uploads of a version that already exists, so
  always let the script bump.

## Listing fields

**Name:** 10block

**Summary (short description, ≤132 chars):**

> Block the site you're on for 10 minutes. Two clicks, no typing — and no way to unblock early.

**Category:** Productivity

**Language:** English

**Detailed description:**

> **10block — pause a site for 10 minutes**
>
> You know the spiral. You open one video, or one thread, and twenty minutes are gone.
> 10block puts a stop sign in front of that moment: two clicks, and the site you're on
> is paused.
>
> **Two clicks, zero typing**
>
> Click the 10block icon on the site you want to escape. The domain is already filled
> in — it's read from the tab you're on, so there's nothing to type and nothing to
> configure. Click **Block youtube.com — for 10 minutes**, and the tab turns into a
> countdown.
>
> Need longer? **30 minutes** and **60 minutes** sit right below it. Every duration is
> a single click.
>
> **A calm countdown, not an error page**
>
> While a site is paused, every visit to it lands on a full-page timer instead — including
> subdomains, so blocking youtube.com also covers m.youtube.com and music.youtube.com.
>
> The countdown page paces a 4-second box-breathing cycle while you wait: inhale, hold,
> exhale, hold, with a ring that expands and contracts in time. The wait does something
> for you instead of just being a wait.
>
> **No early unblock. That's the point.**
>
> There is no "just this once" button. Closing the popup doesn't help. Closing the tab
> doesn't help. Restarting Chrome doesn't help — blocks are stored against an absolute
> expiry time and are still there when the browser comes back.
>
> A block you can undo on impulse isn't a block. It's a suggestion.
>
> **+10 when you genuinely need longer**
>
> The popup lists everything currently paused, with the time left on each. Every entry has
> a **+10** button that adds ten more minutes, up to a 60-minute cap. Extending a block is
> one click. Ending one early isn't an option.
>
> **It unblocks itself**
>
> At 0:00 the block lifts on its own and sends you straight back to the site. Nothing to
> undo, nothing to clean up, nothing to remember.
>
> **Good for**
>
> - The "just one video" moment, before it becomes an hour.
> - The reflex tab-open you don't even notice yourself doing.
> - Getting through a specific task without renegotiating with yourself every few minutes.
> - Anyone who's bounced off blockers that ask for schedules, categories, and accounts
>   before they'll block anything at all.
>
> **Private by design**
>
> 10block has no servers, no accounts, and no analytics. It never sends your browsing
> anywhere — the extension makes no network requests at all. The only thing it stores is
> the list of domains you paused and when each one expires, kept locally on your device
> and removed when the timer runs out.
>
> **What it deliberately doesn't do**
>
> No schedules. No categories or blocklists to maintain. No syncing, no login, no
> streaks, no score. It blocks the site you're looking at, for a few minutes, and then
> gets out of the way.

**Single purpose (required):**

> Temporarily block a website the user chooses, for a fixed duration, and show a countdown
> page in place of that site until the timer expires.

## Privacy & data

- **Privacy policy URL:** https://github.com/billye2/pdfxtn/blob/main/docs/10block-PRIVACY.md
  — master copy is `10block-PRIVACY.md` in this repo's root; the published copy is hosted
  in the public `billye2/pdfxtn` repo because `billye2/10block` is private. Verified
  publicly reachable. **Edit both copies together.**
- **Data collection:** None. Declare "does not collect or use" for every category. Blocked
  domains and expiry timestamps stay in `chrome.storage.local` and are never transmitted.
- **Remote code:** Select **"No, I am not using remote code."** Everything is bundled; the
  extension loads no remotely-hosted or dynamically fetched code.
- **Disclosures to certify:** "I do not sell or transfer user data to third parties,"
  "…not use or transfer for purposes unrelated to the item's single purpose," "…not use or
  transfer to determine creditworthiness / for lending."

## Permission justifications (paste per-permission)

> Paste-ready versions of everything in this section, formatted per dashboard field,
> are in **`docs/privacy-practices-copy.md`**.

- **declarativeNetRequest:** Adds a dynamic rule that redirects top-level navigations to the
  domain the user chose to block, sending them to the extension's own countdown page. The
  rule is removed when the timer expires.
- **storage:** Stores each blocked domain's absolute expiry timestamp in `storage.local`, so
  a block survives the popup closing, the service worker sleeping, and a browser restart.
- **alarms:** Schedules the exact expiry moment so the block is lifted automatically at 0:00
  without the user doing anything.
- **tabs:** Reads the active tab's URL when the popup opens, so the site to block is filled
  in without typing, and navigates that tab to the countdown page when a block starts.
- **host_permissions `<all_urls>`:** Under `declarativeNetRequest`, `block` and `allow`
  rules need **no host permissions at all** — 10block could block sites without requesting
  any host access. It deliberately doesn't, because a plain `block` leaves the user on a
  browser network-error page. It uses a `redirect` rule to send the navigation to its own
  countdown page instead, and `redirect` is the one action that requires host access for
  the matched request. The domain isn't knowable in advance — it's whatever site the user
  is on when they click. A fixed site list would only ever block a predetermined set, and
  `activeTab` grants access only *while* the extension is being invoked, whereas the block
  must act on navigations minutes later. Used solely to match top-level (`main_frame`)
  navigations to domains the user actively chose; no initiator permission is involved, and
  no page content is ever read or injected.

> ⚠️ `<all_urls>` is the highest-friction part of this listing and the dashboard has
> already flagged it, suggesting `activeTab` or a fixed site list. **Decision: keep it**
> — see HANDOFF.md for the reasoning and the fallback if review pushes back. Expect a
> slower first review.

> The full-length version of every justification above, formatted per dashboard field,
> is in `docs/privacy-practices-copy.md`. **Keep the two in sync.**

## Assets

All generated into `marketing/store/` — rebuild everything with **`npm run assets`**.
See `marketing/README.md`.

- **Store icon:** 128×128 — `marketing/store/store-icon-128.png`
- **Screenshots (1280×800):** `screenshot-1.png` … `screenshot-5.png`, in upload order:
  1 "Two clicks. Zero typing." (popup over a page); 2 "The site becomes a countdown.";
  3 "Box-breathing, built in."; 4 "Need longer? +10."; 5 "No early unblock. That's the point."
- **Promo tiles:** `promo-tile-440x280.png` (small), `marquee-1400x560.png` (marquee)
- **Promo video:** `promo-video-1280x800.webm` — 31 s, silent with caption overlays. The
  dashboard field takes a **YouTube URL, not a file**: upload the webm to YouTube (webm is
  accepted directly), then paste the URL into "Promotional video".
  **Not yet uploaded** — record the URL here once it is.

## Notes

- The Web Store renders description URLs as plain text, not links. For a clickable link,
  set a **Homepage URL** under _Store listing → Additional fields_ — but only once there's
  a public page to point at (the repo is private today).
- The description makes no open-source claim, deliberately: `billye2/10block` is private.
  If you make it public, add a "Free and open source" section and the repo link.

## Pre-submit checklist

- [ ] `npm run release` produced a fresh `release/10block-<version>.zip`.
- [ ] Register as a Chrome Web Store developer (one-time $5 fee) at
      https://chrome.google.com/webstore/devconsole
- [ ] Create item → upload the ZIP.
- [ ] Fill listing (name, summary, description, category, language).
- [ ] Upload icon + screenshots + promo tiles.
- [ ] Upload the promo video to YouTube; paste the URL.
- [ ] **Publish `10block-PRIVACY.md` at a public URL and set the Privacy policy URL.**
- [ ] Complete the data-usage form and the per-permission justifications above.
- [ ] Choose visibility (Public / Unlisted) and distribution regions.
- [ ] Submit for review (`<all_urls>` will likely extend the first review).
