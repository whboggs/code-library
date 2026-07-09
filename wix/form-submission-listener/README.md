# Wix — Form Submission Listener

Captures **Wix Forms** submissions on the front end and pushes a normalized
event to `window.dataLayer`, so GTM Custom Event triggers can fire downstream
tags (Meta Pixel Lead, GA4 conversion, Meta CAPI, etc.).

## What it does

Subscribes to the Velo `onWixFormSubmitted` event for one or more Wix Forms,
normalizes the submitted fields, and pushes a `wix_form_submit` event to the
GTM dataLayer. It only fires **after the server accepts the submission**, so
failed or invalid submits never generate an event.

| Source | dataLayer event | dataLayer variables |
|---|---|---|
| Wix Form `onWixFormSubmitted` (server-accepted submit) | `wix_form_submit` | `wix_event_id`, `wix_email`, `wix_phone`, `wix_first_name`, `wix_last_name`, `wix_full_name`, `wix_form_id`, `wix_form_data` |

`wix_form_data` is the full submission keyed by each field's label, so any
custom field is reachable via a dot-notation Data Layer Variable
(e.g. `wix_form_data.Company`).

## Why there are two files

Velo frontend code runs in a sandbox where `window.dataLayer` is frequently
`undefined` — you can't reliably push to it from page code. So the work is
split:

- **`listener.js`** — Velo page/site code. Listens for form submissions and
  builds the normalized payload.
- **`datalayer-bridge.js`** — a Wix **Custom Element**. Custom Elements run in
  the *real page window* (where GTM lives), so this one actually performs the
  `dataLayer.push`. The listener hands it the payload via a `data-payload`
  attribute.

## Prerequisites

- **Classic Wix Editor or Wix Studio — NOT Wix Harmony.** The Wix Harmony
  editor (launched Jan 2026) has no Velo, no Dev Mode, and no Custom Elements,
  so this listener cannot run there. On a Harmony site, check whether Wix's
  built-in GTM integration already pushes its automatic `lead` event on form
  submit (no field values), or track forms from the GTM side instead.
- **GTM installed on the Wix site.** Add it via **Settings → Custom Code** (or
  Wix's Marketing Integrations), firing on all pages in the `<head>`. The
  bridge pushes to whatever `dataLayer` GTM created.
- A site plan / setup that allows **Velo** (Dev Mode) and **Custom Elements**.

## Installation

This is a **one-time** setup. The listener lives in `masterPage.js`, so it
runs on every page automatically (Step 2); the Custom Element only needs to
exist on **pages that have forms** — the listener no-ops on pages where it
isn't found (Step 1 covers site-wide placement options). To add a new form
later, you only append its ID to `FORM_SELECTORS`.

### Step 1: Add the Custom Element (the bridge)

1. In the Wix Editor, **Add Elements (+) → Embed & Social → Custom Element**.
2. Select the element and click **Choose Source**. Two options:
   - **Velo file** — with Dev Mode on, copy `datalayer-bridge.js` into your
     site's **`public/custom-elements/`** folder (it must be in that exact
     directory to appear in the picker), then select it. Recommended — the
     code is pinned and can't change under you.
   - **Server URL** — paste this file's jsDelivr URL:
     `https://cdn.jsdelivr.net/gh/whboggs/marketing-toolkit/wix/form-submission-listener/datalayer-bridge.js`
     (updates automatically as the toolkit improves, with the usual
     third-party-hosting caveat).
3. Set **Tag Name** to `wix-datalayer-bridge` — it must exactly match the name
   in the file's `customElements.define()`.
4. In the Properties & Events panel, give the element the **ID**
   `dataLayerBridge` (matches `BRIDGE_SELECTOR` in `listener.js`). It renders
   nothing, so its size and position don't matter.
5. Decide where it lives:
   - **Only some pages have forms?** Just place the element on those pages
     (or only the one page). Nothing else needed.
   - **Site-wide, classic Wix Editor:** right-click the element → **Show on
     All Pages**. The toggle is missing/disabled while the element sits inside
     a container, section, or the footer — drag it to page level first.
     Alternatively, place it in the **footer**, which appears on every page by
     construction.
   - **Site-wide, Wix Studio:** there is no per-element "show on all pages" —
     place the element inside a **Global Section** (e.g. your global footer).

### Step 2: Add the listener (Velo) — once, site-wide

1. Turn on **Dev Mode / Velo**.
2. Paste `listener.js` into **`masterPage.js`** (Velo's Site Code, under
   *Public & Backend*). This runs on every page, so one paste covers every form
   on the site — no per-page code.
   *(If you truly only ever want a single page tracked, you can paste it into
   that page's code panel instead, but `masterPage.js` is the recommended
   default.)*
3. Edit the CONFIG block at the top:
   - `FORM_SELECTORS` — the ID of each Wix Form to listen to (e.g.
     `['#wixForms1']`). Click a form in the Editor to read its ID.
   - `BRIDGE_SELECTOR` — leave as `'#dataLayerBridge'` unless you renamed the
     Custom Element.

### Step 3: Create the GTM trigger

In GTM, go to **Triggers → New**:

- **Trigger Type:** Custom Event
- **Event name:** `wix_form_submit`
- **Name:** `Custom Event - Wix Form Submit`

### Step 4: Create dataLayer variables

For each value you want downstream, **Variables → User-Defined → New**:

- **Variable Type:** Data Layer Variable
- **Data Layer Variable Name:** `wix_email` (or `wix_phone`,
  `wix_form_data.Company`, …)
- **Name:** `DLV - Wix Email`

### Step 5: Fire a downstream tag

Example — a Meta Pixel Lead event on every Wix form submit:

- **Trigger:** `Custom Event - Wix Form Submit`
- **Tag:** Meta Pixel Lead. Pass `{{DLV - Wix Email}}` / `{{DLV - Wix Phone}}`
  as user-data, and use `{{DLV - Wix Event ID}}` (`wix_event_id`) as the Pixel
  `eventID` so a Meta CAPI copy of the same event dedupes correctly.

To fire only for a specific form, add a trigger condition on `wix_form_id`.

### Step 6: Preview and publish

1. **Preview** the Wix site and open GTM's **Preview / Tag Assistant**.
2. Submit a Wix form — confirm `wix_form_submit` appears in the event stream
   with the expected variables.
3. Publish the Wix site **and** the GTM container.

## Known limitations

- **Wix Forms only.** `onWixFormSubmitted` fires for native Wix Forms elements.
  Custom HTML forms, third-party embeds (Typeform, JotForm, etc.), and the Wix
  Bookings/Stores checkouts do **not** trigger it.
- **Field-value payload includes PII.** Unlike the Gravity Forms listener, this
  one intentionally forwards submitted values (email/phone are the point of a
  lead event). That means names, emails, and any free-text answers land in the
  dataLayer and every downstream GTM tag — only forward what your tags need,
  and keep PII out of analytics tags that shouldn't receive it.
- **Identity detection is best-effort.** `wix_email`/`wix_phone` are detected by
  value pattern; names by field label containing "first"/"last"/"name". Odd
  field labels may not map — read the raw value from `wix_form_data` instead.
- **Requires the Custom Element bridge.** Pushing to `window.dataLayer` straight
  from Velo is unreliable; if you skip `datalayer-bridge.js`, nothing reaches
  GTM.
- **No server-side submission details.** The frontend event has field
  names/values only — not the Wix contact ID or server submission timestamp.
  Use a Velo backend `onFormSubmit` handler if you need those.

## FAQ

### Why can't the bridge just be a GTM Custom HTML tag? It's only an HTML element.

Because the element's real job isn't hosting HTML — it's being **addressable
from Velo**. Velo code runs in a sandboxed worker with no DOM access; the only
things in the page window it can talk to are elements registered in Wix's own
element tree, via `$w()`. That is exactly the channel the listener uses:
`$w('#dataLayerBridge').setAttribute('data-payload', …)`.

A GTM Custom HTML tag injects a script into the page, but that script is not
in Wix's element tree — `$w()` can't see it, so Velo has no way to hand it the
form data. The Custom Element is less "the thing that pushes to dataLayer" and
more "the only door between Velo's sandbox and the page window"; the push is
just what it does when data comes through the door.

### Could the bridge go somewhere else in Wix — like Settings → Custom Code?

No. Scripts added via **Settings → Custom Code** run in the page window, but
they aren't in `$w()` scope either, so Velo can't reach them — same problem as
a GTM tag. Velo's only other page-window channel is the HTML iframe embed
(`postMessage`), but Wix hosts those iframes on a different origin, so the
iframe can't touch the parent page's `dataLayer` — and it would still be an
on-page element anyway. If Velo is doing the listening, a Custom Element is
the mechanism.

(Wix's `wixWindowFrontend.trackEvent("CustomEvent", …)` used to be a
no-element path to the dataLayer when GTM was installed through Wix's
marketing integrations, but Wix has deprecated it and it only emits legacy
Universal-Analytics-style events — not something to build new tracking on.)

### Does this have to use Velo at all? Can't I do it all in one GTM tag?

You *can* avoid Velo and the Custom Element entirely by doing everything in a
single GTM Custom HTML tag (fire on **All Pages**) that detects the submission
by intercepting Wix's form-submit network request. The trade-off is
reliability: that approach reads Wix's private, undocumented submission
endpoint and payload shape, which Wix changes without notice — so it can go
blind after a Wix update. This listener uses the documented
`onWixFormSubmitted` API instead — which gives clean, structured field data —
and that is why it needs the two-piece (Velo + Custom Element) setup.

### Do I have to add this to every page that has a form?

The code, no — the listener lives in `masterPage.js` and runs everywhere
automatically. The Custom Element must exist on each page where a tracked form
lives: either place it there directly, or make it site-wide once (classic
Editor: **Show on All Pages** or the footer; Wix Studio: a Global Section —
see Step 1). Adding a new form later is just one more ID in `FORM_SELECTORS`.

## Disclaimer

Provided as-is under the MIT License. Test thoroughly before relying on it for
revenue attribution.

---

**Packaged by W.H. Boggs** — [whboggs.com](https://whboggs.com)
[→ Free Meta Ads audit](https://whboggs.com/audit)
