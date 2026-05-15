# Gravity Forms — fbc/fbp Populator

Auto-fills two Gravity Forms hidden fields with the visitor's `_fbc` and `_fbp` cookie values, so the values can be sent server-side via the Meta Conversions API on submission.

Pair this with the [Gravity Forms GTM Listener](../listener/) — the listener pushes these hidden field values into `dataLayer.gforms_fields` on submit, where your Meta Pixel Lead / CAPI tag can read them.

## Why both fbc and fbp?

| Cookie | What it is | When it's set |
|---|---|---|
| `_fbc` | Facebook click ID — derived from `?fbclid=...` on entry | Only on visitors who clicked through a Facebook/Instagram ad |
| `_fbp` | Facebook browser ID — first-party browser identifier | Every visitor who loads a page with Meta Pixel installed |

The Meta Conversions API matches conversions to ad clicks using these values, so capturing both improves attribution accuracy. See [Meta's Conversions API parameters docs](https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/customer-information-parameters).

## Setup

### Step 1: Add the hidden fields in Gravity Forms

For each cookie (`fbc`, `fbp`):

1. Edit your form → add a **Hidden** field
2. Open the field → **Advanced** tab
3. Check **Allow field to be populated dynamically**
4. Set **Parameter Name** to `fbc` or `fbp` (the parameter name — without the leading underscore — is what the PHP filter hooks onto)
5. Save

Note the numeric field ID of each hidden field — you'll need them in Step 3.

### Step 2: Install the populator

Two install options. Use PHP by default. Use the GTM JS fallback only when a page cache is in play.

| File | Pattern | When to use |
|---|---|---|
| `populator.php` | WordPress PHP filter | **Default.** Runs server-side per request. |
| `populator-inline.html` | GTM Custom HTML tag with JS fallback | Only when a page cache (LiteSpeed, WP Rocket, host-level) serves the same form HTML to multiple visitors. |

#### Option A: PHP filter (recommended)

Drop `populator.php` into your theme's `functions.php`, or paste into a PHP snippet plugin (WPCode, Code Snippets, etc.). No configuration needed — the filter hooks bind to the parameter names you set in Step 1.

#### Option B: GTM JS fallback

Open `populator-inline.html` and edit the `MAPPINGS` block — left side is the form input's HTML `name` (`input_N` where N is your hidden field's ID), right side is the cookie name:

```js
var MAPPINGS = {
  'input_18': '_fbc',  // replace 18 with your fbc field's ID
  'input_17': '_fbp'   // replace 17 with your fbp field's ID
};
```

In GTM:
1. **Tags → New → Custom HTML**
2. Paste the contents of `populator-inline.html`
3. **Trigger:** All Pages — Page View
4. Save and publish

### Step 3: Wire the values into your CAPI tag

Assumes the [GF GTM Listener](../listener/) is also installed (it pushes hidden field values into `gforms_fields` on `gforms_form_submit`).

In GTM create two Data Layer Variables:

| Variable name | Data Layer Variable Name |
|---|---|
| `DLV - GF fbc` | `gforms_fields.input_{your fbc field ID}` |
| `DLV - GF fbp` | `gforms_fields.input_{your fbp field ID}` |

In your Meta Pixel Lead tag (triggered on `gforms_form_submit`), pass:
- `fbc` → `{{DLV - GF fbc}}`
- `fbp` → `{{DLV - GF fbp}}`

## Known limitations

- **No `fbclid`, no `_fbc` cookie.** The `_fbc` cookie is only created by the Meta Pixel when a visitor lands with `?fbclid=...` in the URL. Direct, organic, and email traffic produce empty `fbc` values — this is expected and correct.
- **Pixel must run before the form renders.** `_fbp` is set on every Pixel page-view. As long as your Meta Pixel base code loads before GF renders the form (it does by default in GTM), the cookie will exist.
- **Consent gating.** If your consent platform blocks the Meta Pixel before consent is granted, neither cookie exists, and both fields stay empty — the correct behavior under GDPR / similar regimes.
- **Don't use both Option A and Option B at once.** Pick one. Running both is harmless (the JS will just re-set the same value the PHP already populated) but adds an extra GTM tag for no benefit.

## Disclaimer

Provided as-is under the MIT License. Test thoroughly before relying on it for revenue attribution.

---

**Packaged by W.H. Boggs** — [whboggs.com](https://whboggs.com)
[→ Free Meta Ads audit](https://whboggs.com/audit)
