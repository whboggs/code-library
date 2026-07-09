# Wix — Form Submission Listener (No-Velo / Harmony-compatible)

Captures **Wix Forms** submissions **without Velo** and pushes a normalized
`wix_form_submit` event to `window.dataLayer` for GTM. Use this on sites built
in the **Wix Harmony** editor (which has no Velo, Dev Mode, or Custom
Elements), or anywhere you can't / don't want to touch site code.

If your site is in the **classic Wix Editor or Wix Studio**, prefer the
[Velo listener](../form-submission-listener/) instead — it uses Wix's
documented API and won't silently break when Wix changes their internals.

## How it works (and the trade-off)

The script runs entirely in the page window. It wraps `fetch` and
`XMLHttpRequest`, watches for Wix's form-submit request (`/_api/...submit...`),
and — only when the server accepts the submission (2xx) — parses the request
body, normalizes it, and pushes to the dataLayer.

**The trade-off:** this reads Wix's private, undocumented submission endpoints
and payload shapes. Wix can change them without notice, at which point the
listener goes quiet until re-tuned. Re-verify in GTM Preview after Wix
platform updates, and especially before relying on it for revenue attribution.

## Before you install: check Wix's built-in `lead` event

If GTM is connected through Wix's own marketing integration, native Wix forms
may already push an automatic `lead` event to the dataLayer. Open GTM Preview,
submit your form, and look for it. If it's there **and you don't need field
values** (it carries none — no email/phone for Meta CAPI matching), trigger
your tags off `lead` and skip this listener entirely.

## dataLayer output

Same event name and `wix_*` keys as the Velo listener, so GTM triggers and
variables are interchangeable between the two:

| dataLayer event | dataLayer variables |
|---|---|
| `wix_form_submit` | `wix_event_id`, `wix_email`, `wix_phone`, `wix_first_name`, `wix_last_name`, `wix_form_id`, `wix_endpoint`, `wix_form_data` |

`wix_form_data` is the submission request flattened to dot-path keys (e.g.
`submission.email`) — inspect one submit in GTM Preview to see your form's
exact paths, then read any field with a Data Layer Variable like
`wix_form_data.submission.email`. `wix_endpoint` records which request URL
matched, for debugging.

## Installation

Pick **one** of the two placements:

### Option A: GTM Custom HTML tag (recommended)

Keeps the script versioned and pausable inside your container.

1. GTM → **Tags** → **New** → **Custom HTML**.
2. Paste the contents of `listener-inline.html`.
3. **Triggering:** All Pages — Page View.
4. Name it `cHTML - Wix Form Listener (No-Velo)` and save.

(GTM itself must be installed on the site — on Harmony: **Settings → Custom
Code → Head**, all pages.)

### Option B: Wix Custom Code slot

1. Wix dashboard → **Settings → Custom Code** → **+ Add Custom Code**.
2. Paste the contents of `listener-inline.html`.
3. Place in **Body - End**, load on **All pages**, load once per visit.

### Then: GTM trigger, variables, downstream tags

Identical to the Velo listener — follow
[its README from Step 3](../form-submission-listener/README.md#step-3-create-the-gtm-trigger)
(Custom Event trigger on `wix_form_submit`, DLVs, Meta Pixel `eventID` from
`wix_event_id` for CAPI dedup).

### Verify

1. GTM **Preview** → submit a real form on the live/preview site.
2. Confirm `wix_form_submit` appears with your field values in
   `wix_form_data`.
3. **If nothing fires:** open DevTools → **Network**, submit the form, and find
   the POST request Wix sends. If its URL doesn't contain `submit`/`submission`
   under `/_api/`, edit `ENDPOINT_RE` at the top of the script to match that
   request's path.

## Known limitations

- **Fragile by nature.** Undocumented endpoints and payload shapes; a Wix
  update can silently stop events. The Velo listener doesn't have this
  problem — use it where Velo exists.
- **JSON request bodies only.** Submissions sent as non-JSON (multipart file
  uploads, `sendBeacon`) aren't parsed.
- **Field paths are site-specific.** `wix_form_data` mirrors whatever Wix's
  request looks like on your site — always confirm paths in GTM Preview before
  wiring DLVs.
- **Identity detection is best-effort.** Email/phone by value pattern,
  first/last name by key name. Anything missed is still in `wix_form_data`.
- **PII lands in the dataLayer.** Same caveat as the Velo listener: forward
  only what each downstream tag needs.
- **Same-page dedupe only.** Duplicate requests within 3s are suppressed;
  there's no cross-pageview/localStorage dedupe.

## Disclaimer

Provided as-is under the MIT License. Test thoroughly before relying on it for
revenue attribution.

---

**Packaged by W.H. Boggs** — [whboggs.com](https://whboggs.com)
[→ Free Meta Ads audit](https://whboggs.com/audit)
