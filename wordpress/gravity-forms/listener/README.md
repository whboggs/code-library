# Gravity Forms — GTM Listener

Pushes Gravity Forms front-end events to `window.dataLayer` so GTM Custom Event triggers can fire downstream tags (Meta Pixel Lead, GA4 conversion, etc.).

## What it does

Binds jQuery handlers to Gravity Forms' client-side hooks and pushes a normalized event to the GTM dataLayer.

| Gravity Forms hook | dataLayer event | dataLayer variables |
|---|---|---|
| `gform_confirmation_loaded` | `gforms_form_success` | `gforms_form_id` |
| `gform_page_loaded` | `gforms_page_loaded` | `gforms_form_id`, `gforms_current_page` |

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

### Step 5: Preview and publish

1. Click **Preview** to test in Tag Assistant
2. Submit a Gravity Form on your site — verify in the Preview console that `gforms_form_success` appears in the event stream
3. Once verified, publish your container

## How updates work

The listener logic is hosted on jsDelivr and currently pulled from `@main` for testing. Once a `v1.x.x` git tag is published, switch the `src` in `listener-config.html` from `@main` to `@v1` for cache-stable releases.

## Known limitations

- **AJAX submissions only**: `gform_confirmation_loaded` only fires when the form is configured to submit via AJAX (the "Enable AJAX" checkbox in the form's embed shortcode or block). For non-AJAX forms the page reloads to a confirmation URL — track those with a URL-based GTM trigger instead.
- **Requires jQuery**: Gravity Forms loads jQuery by default. If you've stripped it out (e.g., via a "remove jQuery" performance plugin), this listener warns in console and exits without binding.
- **No per-form filtering at the listener level**: Every form ID pushes the same dataLayer event. Filter in your downstream GTM trigger conditions using `gforms_form_id` if you only want to fire for specific forms.

## Disclaimer

Provided as-is under the MIT License. Test thoroughly before relying on it for revenue attribution.

---

**Packaged by W.H. Boggs** — [whboggs.com](https://whboggs.com)
[→ Free Meta Ads audit](https://whboggs.com/audit)
