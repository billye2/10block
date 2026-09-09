# Privacy practices — copy & paste

Paste each block into the matching field on the Chrome Web Store **Privacy practices** tab.

---

## Single purpose

10block temporarily blocks a website the user chooses, for a fixed duration, and shows a countdown page in place of that site until the timer expires. The user clicks the toolbar icon on the site they want to pause and picks 10, 30, or 60 minutes; the site is redirected to a countdown page until the time runs out, at which point the block lifts automatically.

---

## declarativeNetRequest justification

When the user chooses to block a site, the extension adds one dynamic declarativeNetRequest rule that redirects top-level (main_frame) navigations for that domain to the extension's own countdown page. The rule is removed automatically when the timer expires. This is the mechanism that performs the blocking, which is the extension's single purpose. declarativeNetRequest is used specifically so that Chrome enforces the rule and the extension is never given access to the user's requests or browsing activity.

---

## storage justification

The extension uses chrome.storage.local to store the domains the user has currently paused and the timestamp each block expires at. This is required so a block survives the popup closing, the background service worker going idle, and a browser restart — without it, a user could end a block early just by quitting Chrome, which would defeat the extension's purpose. Each entry is deleted automatically when its timer reaches zero. chrome.storage.local is used rather than chrome.storage.sync so this never leaves the user's device.

---

## alarms justification

The extension creates one alarm per blocked domain, set to that block's exact expiry time. When the alarm fires, the extension removes the blocking rule and the site becomes reachable again. This is what allows a block to end on its own at 0:00 without the user taking any action, and it works even if the background service worker has been suspended in the meantime.

---

## tabs justification

When the user opens the popup, the extension reads the address of the active tab so the site to block is filled in automatically — this is what makes blocking two clicks with no typing. It also uses tabs to navigate that same tab to the countdown page at the moment a block starts, because declarativeNetRequest rules only apply to new navigations and would not affect the page already open. Tabs are not monitored, logged, or read at any other time; nothing is accessed while the popup is closed.

---

## Host permission justification (`<all_urls>`)

10block is a website blocker. The user picks the site to block at the moment they click the toolbar icon, so the domain cannot be known in advance.

Note first that under the declarativeNetRequest permission, "block" and "allow" rules require no host permissions at all. 10block could therefore block sites without requesting any host access. It deliberately does not, because a plain "block" rule leaves the user staring at a browser network-error page. Instead 10block uses a "redirect" rule to send the navigation to its own countdown page, which shows the time remaining and a box-breathing guide — that page is the substance of the extension, not an incidental detail. Redirect rules are the one action that requires host access for the request being matched, and that is the sole reason this permission is requested.

Why a narrower permission cannot work:

Specifying particular sites in the manifest would mean the extension could only ever block a predetermined list. The user chooses the site themselves, at click time, and it can be any site they find themselves losing time to.

activeTab is not sufficient either. activeTab grants access only while the user is actively invoking the extension, but the entire function of this extension is to block navigations that happen later — minutes after the popup has closed, in any tab, at a moment when the user is deliberately not invoking the extension. A permission scoped to the moment of invocation cannot act on a navigation that happens afterwards, which is exactly when the block has to work.

What the permission is used for: solely to let declarativeNetRequest redirect rules match top-level (main_frame) navigations to the specific domains the user has actively chosen to block. Because these are navigation requests, host access is needed only for the request URL itself; no initiator permission is involved. One rule is added when the user starts a block, and it is removed automatically when the timer expires.

What it is not used for: the extension declares no content scripts and does not use the scripting or webRequest APIs. It never injects code into any page, never reads or modifies any page's content, and never observes the user's browsing — declarativeNetRequest rules are evaluated by Chrome itself, and the extension is never handed the requests they match. The extension makes no network requests of any kind and transmits no data anywhere.

---

## Remote code

Select **"No, I am not using remote code."**

All code and assets are bundled in the package. The extension loads no remotely-hosted scripts and executes no dynamically fetched or evaluated code.

---

## Data usage

Declare **"does not collect or use"** for every data category (personally identifiable information, health information, financial information, authentication information, personal communications, location, web history, user activity, website content).

The only thing the extension stores is the list of domains the user chose to pause and each one's expiry timestamp, kept in local extension storage on the user's own device and deleted when the timer ends. Nothing is transmitted anywhere.

**Certifications to check:**

- I do not sell or transfer user data to third parties, outside of the approved use cases
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose
- I do not use or transfer user data to determine creditworthiness or for lending purposes

---

## Privacy policy URL

Paste this into the **Privacy policy URL** field:

```
https://github.com/billye2/10block/blob/main/10block-PRIVACY.md
```

`10block-PRIVACY.md` in this repo's root is the master copy. Because `billye2/10block` is
private, the published copy is hosted in the **public** `billye2/pdfxtn` repo under
`docs/`. Verified reachable without authentication.

⚠️ **Edit both copies together** — the hosted one is what reviewers and users read. If
`billye2/10block` is ever made public, move the policy to its own repo and update this URL.
