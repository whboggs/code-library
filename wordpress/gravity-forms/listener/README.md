# Gravity Forms — GTM Listener

Pushes Gravity Forms front-end events to `window.dataLayer` so GTM Custom Event triggers can fire downstream tags (Meta Pixel Lead, GA4 conversion, etc.).

## What it does

Subscribes to Gravity Forms' client-side hooks — both the legacy jQuery events (pre-2.9) and the native `gform/...` CustomEvents / filter API introduced in 2.9 — and pushes a normalized event to the GTM dataLayer. Duplicate pushes are suppressed when both paths fire for the same submission.

| Gravity Forms hook | dataLayer event | dataLayer variables |
|---|---|---|
| `submit` on a GF form (any submission method) | `gforms_form_submit` | `gforms_form_id`, `gforms_fields` |
| `gform_confirmation_loaded` (jQuery, ≤2.8 + 2.9 compat) | `gforms_form_success` | `gforms_form_id` |
| `gform/ajax/post_ajax_submission` (native filter, 2.9+) | `gforms_form_success` | `gforms_form_id` |
| `gform_confirmation_message_{id}` element on page load (non-AJAX) | `gforms_form_success` | `gforms_form_id` |
| `gform_page_loaded` (jQuery, ≤2.8 + 2.9 compat) | `gforms_page_loaded` | `gforms_form_id`, `gforms_current_page` |
| `gform/ajax/post_page_change` (native event, 2.9+) | `gforms_page_loaded` | `gforms_form_id`, `gforms_current_page` |
| `focusout` on a GF input with a non-empty value | `gforms_field_complete` | `gforms_form_id`, `gforms_field_id` |

## Two install options

Pick one — they produce identical dataLayer events.

| File | Pattern | When to use |
|---|---|---|
| `listener-config.html` | CDN loader (fetches hosted JS from jsDelivr) | Default. Updates push automatically. |
| `listener-inline.html` | Self-contained (logic inlined into the tag) | No outbound CDN dependency. Re-paste to upgrade. |

## Installation

### Step 1: Create the Custom HTML tag

In GTM, go to **Tags** → **New**:

1. Click **Tag Configuration** → choose **Custom HTML**
2. Paste the contents of `listener-config.html` **or** `listener-inline.html` into the HTML field
3. Click **Triggering** → choose **All Pages — Page View**
4. Name the tag: `cHTML - Gravity Forms Listener`
5. Save

### Step 2: Create dataLayer triggers per event

For form success, in GTM go to **Triggers** → **New**:

- **Trigger Type:** Custom Event
- **Event name:** `gforms_form_success`
- **Name:** `Custom Event - GF Form Success`

Repeat for `gforms_page_loaded` if you want to track multi-page navigation.

### Step 3: Create dataLayer variables

For each variable you want to use in downstream tags, go to **Variables** → **User-Defined Variables** → **New**:

- **Variable Type:** Data Layer Variable
- **Data Layer Variable Name:** `gforms_form_id`
- **Name:** `DLV - GF Form ID`

Repeat for `gforms_current_page` if needed.

### Step 4: Use the trigger in a downstream tag

Example — fire a Meta Pixel Lead event when any Gravity Form succeeds:

- **Trigger:** `Custom Event - GF Form Success`
- **Tag:** Meta Pixel Lead event tag (use `{{DLV - GF Form ID}}` as a custom param to segment by form)

To fire only for a specific form, add a trigger condition: `DLV - GF Form ID equals 3`.

### Capturing hidden field values (fbc, gclid, utm_*) for Meta CAPI / GA4

`gforms_form_submit` fires on every Gravity Forms submission (AJAX or not) and includes a `gforms_fields` object with every **user-defined hidden field** in the form, keyed by HTML `name`. GF's own internal hiddens (`gform_submit`, `state_*`, `_wp_http_referer`, etc.) are skipped. Visible inputs (text, email, radio, etc.) are **not** included — see "Known limitations" below.

Typical Meta Pixel CAPI flow:

1. In Gravity Forms, add a Hidden field to your form. Note its field ID (e.g., field 20).
2. Populate it with the visitor's `fbc` using `gform_field_value_*` server-side, or via the field's "Allow field to be populated dynamically" parameter and a URL parameter / JS snippet.
3. In GTM, create a Data Layer Variable:
   - **Variable Type:** Data Layer Variable
   - **Data Layer Variable Name:** `gforms_fields.input_20` (replace `20` with your field ID)
   - **Name:** `DLV - GF fbc`
4. In your Meta Pixel Lead tag (triggered on `gforms_form_submit`), pass `{{DLV - GF fbc}}` as the `fbc` user-data parameter.

The submit event fires *before* the form navigates away on non-AJAX forms, so GA4 / Meta tags using `sendBeacon` or `keepalive` (the GTM default) will reliably deliver.

### Step 5: Preview and publish

1. Click **Preview** to test in Tag Assistant
2. Submit a Gravity Form on your site — verify in the Preview console that `gforms_form_success` appears in the event stream
3. Once verified, publish your container

## How updates work

The listener logic is hosted on jsDelivr and currently pulled from `@main` for testing. Once a `v1.x.x` git tag is published, switch the `src` in `listener-config.html` from `@main` to `@v1` for cache-stable releases.

## Known limitations

- **Non-AJAX `gforms_form_success` requires the default "Display Message" confirmation type**: The non-AJAX detector looks for `<div id="gform_confirmation_message_{formId}">` on the confirmation page. If the form is configured to redirect to a different URL on success, that page won't contain the marker — track those with a URL-based GTM trigger on the destination page. AJAX forms always work regardless of confirmation type.
- **`gforms_form_submit` only captures hidden fields, not visible ones**: To avoid leaking PII (emails, names, phone, free-text answers) into the dataLayer and every downstream GTM tag, only `input[type=hidden]` user fields are included. Visible inputs are intentionally skipped. If you need a specific visible field's value downstream, extract it in a dedicated GTM Custom JavaScript variable scoped to that field.
- **`gforms_field_complete` never includes the field value**: Same PII reasoning — only `gforms_form_id` and `gforms_field_id` are pushed. Use `gforms_form_submit` if you need values.
- **jQuery optional on GF 2.9+**: On Gravity Forms 2.9 and newer the listener uses the native `gform/...` events and works without jQuery. On older versions (or 2.9 with the legacy submission path) the jQuery handlers are used; if jQuery has been stripped out and the site is also on legacy GF, the listener cannot bind.
- **No per-form filtering at the listener level**: Every form ID pushes the same dataLayer event. Filter in your downstream GTM trigger conditions using `gforms_form_id` if you only want to fire for specific forms.

## Disclaimer

Provided as-is under the MIT License. Test thoroughly before relying on it for revenue attribution.

---

**Packaged by W.H. Boggs** — [whboggs.com](https://whboggs.com)
[→ Free Meta Ads audit](https://whboggs.com/audit)
