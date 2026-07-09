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

- **GTM installed on the Wix site.** Add it via **Settings → Custom Code** (or
  Wix's Marketing Integrations), firing on all pages in the `<head>`. The
  bridge pushes to whatever `dataLayer` GTM created.
- A site plan / setup that allows **Velo** (Dev Mode) and **Custom Elements**.

## Installation

This is a **one-time, site-wide** setup. You do **not** add anything to each
page or each form: the Custom Element is shown on all pages once (Step 1), and
the listener lives in `masterPage.js` so it runs on every page automatically
(Step 2). To add a new form later, you only append its ID to `FORM_SELECTORS`.

### Step 1: Add the Custom Element (the bridge) — once

1. In the Wix Editor, **Add → Embed Code → Custom Element**.
2. Under the element's settings, **Upload files** and upload
   `datalayer-bridge.js` (or point it at the file's jsDelivr URL).
3. Set **Tag Name** to `wix-datalayer-bridge`.
4. Give the element the **ID** `dataLayerBridge` (matches `BRIDGE_SELECTOR` in
   `listener.js`) and set it to show on **all pages**. It renders nothing, so
   its size and position don't matter. You add this element only once, not per
   page.

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

### Does this have to be a Custom Element? Can't I just do it all in one GTM tag?

The Custom Element isn't about convenience — it's the only reliable way to get
data from Velo into `dataLayer`. Velo frontend code can't push to
`window.dataLayer` (it's sandboxed and usually `undefined` there) and it can't
call into a GTM Custom HTML tag either. So whenever you use Wix's official
`onWixFormSubmitted` event — which is what gives you clean, structured field
data — you need one small component running in the real page window to receive
the payload and push it. That's the Custom Element.

You *can* avoid Velo and the Custom Element entirely by doing everything in a
single GTM Custom HTML tag (fire on **All Pages**) that detects the submission
by intercepting Wix's form-submit network request. The trade-off is
reliability: that approach reads Wix's private, undocumented submission
endpoint and payload shape, which Wix changes without notice — so it can go
blind after a Wix update. This listener uses the documented API instead, which
is why it needs the two-piece (Velo + Custom Element) setup.

### Do I have to add this to every page that has a form?

No. It's a one-time, site-wide install. The Custom Element is shown on all
pages once, and the listener lives in `masterPage.js`, which runs on every
page automatically. Adding a new form later is just one more ID in
`FORM_SELECTORS` — no new code or elements. See **Installation** above.

## Disclaimer

Provided as-is under the MIT License. Test thoroughly before relying on it for
revenue attribution.

---

**Packaged by W.H. Boggs** — [whboggs.com](https://whboggs.com)
[→ Free Meta Ads audit](https://whboggs.com/audit)
