# Wix — Form Submission Listener (No-Velo / Harmony-compatible)

Captures **Wix Forms** submissions **without Velo** and pushes a normalized
`wix_form_submit` event to `window.dataLayer` for GTM. Use this on sites built
in the **Wix Harmony** editor (which has no Velo, Dev Mode, or Custom
Elements), or anywhere you can't / don't want to touch site code.

If your site is in the **classic Wix Editor or Wix Studio**, prefer the
[Velo listener](../form-submission-listener/) instead — it uses Wix's
documented API and won't silently break when Wix changes their internals.

## How it works (and the trade-off)

The script runs entirely in the page window, with **two detection layers**
(both active; whichever fires first wins, the other is suppressed):

1. **DOM layer** — when a submit button is clicked (or a native `submit`
   event fires), it snapshots the form's field values. It then watches
   briefly for Wix's success behavior — the fields being cleared or the form
   being removed/replaced — and pushes on success. Validation failures leave
   values in place, so they never push. **This is the layer that works on Wix
   Harmony**, where the submission HTTP request happens inside Wix's platform
   Web Worker and page-level network interception can never see it.
2. **Network layer** — wraps `fetch`/`XMLHttpRequest`/`navigator.sendBeacon`,
   watches for Wix's form-submit request (`/_api/...submit...`), and — only
   when the server accepts the submission (2xx) — parses the request body and
   pushes. Richer payload when it works; silent on worker-based stacks like
   Harmony.

**The trade-off:** both layers read Wix's private, undocumented behaviors.
Wix can change them without notice, at which point the listener goes quiet
until re-tuned. Re-verify in GTM Preview after Wix platform updates, and
especially before relying on it for revenue attribution.

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
| `wix_form_submit` | `wix_event_id`, `wix_email`, `wix_phone`, `wix_first_name`, `wix_last_name`, `wix_form_id`, `wix_detection`, `wix_endpoint`, `wix_form_data` |

`wix_form_data` holds every captured field. Its keys depend on the layer that
fired (`wix_detection`: `dom` or `network`): the DOM layer keys by the input's
`name`/`aria-label`/`placeholder`; the network layer keys by the request
payload's dot-paths (e.g. `submission.email`). Inspect one submit in GTM
Preview to see your form's exact keys, then read any field with a Data Layer
Variable like `wix_form_data.email`. `wix_endpoint` (network layer only)
records which request URL matched, for debugging.

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

### If nothing fires: debug mode

1. In GTM Preview's **Tags Fired**, first confirm the Custom HTML tag itself
   fired on the page.
2. Load the page with **`?wix_listener_debug=1`** appended to the URL (it can
   sit alongside GTM's own debug param: `?gtm_debug=...&wix_listener_debug=1`)
   or run `window.wixFormListenerDebug = true` in the DevTools console. Then
   submit the form and read the `[wix-form-listener]` console lines — every
   click, snapshot, request, and push (or the reason for a skip) is logged:
   - **"snapshot armed" but no "success behavior detected"** → the DOM layer
     saw the click but the form never cleared/disappeared. Check whether the
     form shows a different success behavior (e.g. inline message with values
     kept) and report it.
   - **A request logged but skipped** → the log line says why (endpoint
     didn't match, body unparseable, non-2xx). If the endpoint didn't match,
     edit `ENDPOINT_RE` at the top of the script.
   - **Nothing logged at all around the submit** → the form probably lives in
     an iframe, where neither layer can see it. Confirm with DevTools →
     Elements: if the form is inside an `<iframe>`, this listener can't reach
     it from the parent page.

## Known limitations

- **Fragile by nature.** Undocumented endpoints and payload shapes; a Wix
  update can silently stop events. The Velo listener doesn't have this
  problem — use it where Velo exists.
- **Parsed body shapes: JSON, form-encoded, `FormData`, `URLSearchParams`,
  and JSON `Blob`s** (including via `sendBeacon`). Multipart file-upload
  bodies aren't parsed.
- **The network layer can't see worker-side requests.** On Wix Harmony the
  submission request runs inside Wix's platform Web Worker, so only the DOM
  layer fires there (`wix_detection: dom`). That's expected, not a bug.
- **DOM-layer edge cases.** The success signal is "fields cleared or form
  removed within ~12s of the submit click". A page navigation right after a
  failed submit click could count as "form removed" and cause a false push;
  forms configured to keep values visible after success would be missed. Both
  are rare — verify your form's behavior once in GTM Preview.
- **Password fields are never captured.** All other field types are.
- **Iframe-hosted forms are invisible to both layers.**
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
