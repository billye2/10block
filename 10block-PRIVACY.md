# Privacy Policy — Block Site for 10 Minutes: Stop Doomscrolling

_Last updated: 2026-08-04_

**Block Site for 10 Minutes: Stop Doomscrolling** (developed under the working name
**10block**, used as shorthand below) is a Chrome extension that blocks a website you
choose for a fixed number of minutes and shows a countdown page in its place.

## What we collect

**Nothing.** 10block does not collect, store, transmit, sell, or share any personal
information or user data. There are no analytics, no tracking, no accounts, and no
servers — the extension makes no network requests at all.

## What is stored on your device

10block keeps one thing in your browser's local extension storage
(`chrome.storage.local`), on your device only:

- the list of domains you have currently paused, and the timestamp each one expires at.

That's the whole record. Internally it looks like this:

```
{ "youtube.com": { "expiry": 1753970400000, "ruleId": 812739461 } }
```

- It is stored with `chrome.storage.local`, **not** `chrome.storage.sync`, so it is never
  synced to your Google account or to your other devices.
- Each entry is **deleted automatically** the moment its timer reaches 0:00.
- Uninstalling 10block removes the storage entirely, as the browser deletes an
  extension's storage when it is removed.

No browsing history, no page contents, no URLs beyond the domains you explicitly chose to
block, and nothing at all about sites you never blocked.

## How the blocking works

Blocking uses Chrome's `declarativeNetRequest` API. 10block registers a rule that says
"redirect top-level navigations to this domain to my countdown page," and **Chrome itself
enforces it**. The extension is not told about your navigations and never sees them — it
only adds and removes the rule.

10block has no content scripts and does not use the scripting API, so it never injects
code into web pages or reads their contents.

## Permissions

- **declarativeNetRequest** — registers the redirect rule that sends visits to a paused
  domain to the countdown page, and removes that rule when the timer expires.
- **storage** — saves each paused domain's expiry timestamp locally, so a block survives
  the popup closing, the extension's background worker sleeping, and a browser restart.
- **alarms** — schedules the exact expiry moment so the block lifts on its own at 0:00.
- **tabs** — reads the address of the tab you are currently on **at the moment you open
  the popup**, so the site to block is filled in for you without typing, and switches that
  tab to the countdown page when you start a block. Tabs are not monitored or logged, and
  nothing is read while the popup is closed.
- **host access to all sites (`<all_urls>`)** — `declarativeNetRequest` redirect rules
  require host access for the requests they match, and the domain cannot be known ahead of
  time: it is whatever site you happen to be on when you click. This permission is used
  **only** to match top-level navigations to domains you have actively chosen to block. It
  is never used to read, modify, or transmit the contents of any page.

## Removing your data

- Wait for a block to expire — its entry is deleted automatically.
- Or uninstall 10block, which removes all of its stored data.

There is no data held anywhere else, because none is ever sent anywhere else.

## Children's privacy

10block collects no data from anyone, including children under 13.

## Changes

If this policy changes, the updated version will be published here, with a new
"Last updated" date.

## Contact

Questions about 10block or this policy: open an issue at
https://github.com/billye2/pdfxtn/issues

That tracker belongs to another extension by the same developer and is monitored for
10block as well, as 10block's own repository is not public. You can also use the
"Contact the developer" link on the extension's Chrome Web Store listing.
