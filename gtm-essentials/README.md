# GTM Essentials

Core Google Tag Manager variables we set up on most accounts — first-party
cookie readers, "does it exist" booleans, traffic source / ad placement, and a
few page/post/form context values.

> **Keep the Starter Kit in sync.** [`gtm-starter-kit/`](gtm-starter-kit/)
> bundles copies of every variable below so it imports self-contained. If you
> add, rename, or change anything here, update the Starter Kit export too — or
> the bundled copy will drift.

## Quick import

[`gtm-essentials-variables.json`](variables/gtm-essentials-variables/gtm-essentials-variables.json)
is a GTM container export ([documented here](variables/gtm-essentials-variables/)).
Import it to create all of the variables below at once, filed under a
**GTM Essentials** folder.

1. GTM → **Admin → Import Container**.
2. Choose `gtm-essentials-variables.json`, select your workspace.
3. Pick **Merge** and **Rename conflicting** so nothing existing is overwritten.
4. Preview, then Confirm.

Placeholder account/container IDs (`0`) are remapped into whatever container you
import into.

## What it creates (22 variables)

**First-party cookies** — `1PC - <cookie>` (1st-Party Cookie variables):

| Variable | Cookie | Platform |
|---|---|---|
| `1PC - _fbc` | `_fbc` | Meta |
| `1PC - _fbp` | `_fbp` | Meta |
| `1PC - fbclid` | `fbclid` | Meta |
| `1PC - _gcl_aw` | `_gcl_aw` | Google Ads |
| `1PC - _uetmsclkid` | `_uetmsclkid` | Microsoft Ads |
| `1PC - _ttp` | `_ttp` | TikTok |
| `1PC - _twclid` | `_twclid` | Twitter / X |
| `1PC - li_fat_id` | `li_fat_id` | LinkedIn |

> Cookie names are the common defaults for each platform — adjust the `name`
> parameter if a site stores a click ID under a different cookie.

**Existence booleans** — `cJS - Boolean - <cookie> Exists`, one per cookie
above, built from
[`cjs-boolean-cookie-exists.js`](variables/cjs-boolean-cookie-exists/cjs-boolean-cookie-exists.js):
`function() { return !!{{1PC - <cookie>}}; }`.

**Session variables** (Custom JS) — each also lives on its own in this repo:

- `cJS - Traffic Source` — last-touch traffic source
  ([`cjs-traffic-source.js`](variables/cjs-traffic-source/cjs-traffic-source.js)).
- `cJS - Ad Placement` — `utm_placement`, persisted per session
  ([`ad-placement.js`](variables/cjs-ad-placement/ad-placement.js)).

**Page / post / form context** (Custom JS):

- `cJS - Page Title` — `document.title`
  ([`cjs-page-title.js`](variables/cjs-page-title/cjs-page-title.js)).
- `cJS - Post Title` — the page's `.entry-title` / `h1`, falling back to
  `og:title`
  ([`cjs-post-title.js`](variables/cjs-post-title/cjs-post-title.js)).
- `cJS - Post ID` — the WordPress post/page ID from the `postid-…` /
  `page-id-…` body class
  ([`cjs-post-id.js`](variables/cjs-post-id/cjs-post-id.js)).
- `cJS - Form ID` — the `id` of the first `<form>` on the page
  ([`cjs-form-id.js`](variables/cjs-form-id/cjs-form-id.js)). For the
  *submitted* form's id, use an Auto-Event Variable (Element ID) on a Form
  Submission trigger instead.

**Built-in variables enabled** — the import also switches on GTM's standard
built-ins: Click Classes / Element / ID / Target / Text / URL, Event, Form
Classes / Element / ID / Target / Text / URL, HTML ID, Page Hostname / Path /
URL, and Referrer.

> *Analytics Client ID* is intentionally left out — it has no stable
> container-export type, so enable it by hand in **Configure** if you need it
> (one checkbox).

## All Variables Used
| Custom Variable Name | Meta Parameter | GA4 Parameter | Value Type | Description |
|---|---|---|---|---|
| `cJS - Ad Placement` | `ad_placement` | — | String | Custom JavaScript variable that returns the ad placement for the session. |
| `cJS - Traffic Source` | `traffic_source` | — | String | Custom JavaScript variable that returns the traffic source for the session. |
| `DLV - currency` | `currency` | `currency` | String | The currency for the `value` specified. |
| `DLV - item_category` | `content_category` | `items[].item_category` | String | Category of the page/product. Optional. |
| `DLV - item_id` | `content_ids` | `items[].item_id` | Array of integers or strings | Product IDs associated with the event, such as SKUs. |
| `DLV - item_name` | `content_name` | `items[].item_name` | String | Name of the page/product. Optional. |
| `DLV - item_type` | `content_type` | — (no GA4 equivalent) | String | Either `product` or `product_group` based on the IDs passed in `content_ids` or `contents`. |
| `DLV - items` | `contents` | `items[]` array | Array of objects | Array of JSON objects with product IDs and quantities. `id` and `quantity` required. |
| `DLV - num_items` | `num_items` | — (sum of `items[].quantity`) | Integer | Used with `InitiateCheckout`. Number of items when checkout was initiated. |
| `DLV - predicted_ltv` | `predicted_ltv` | — (GA4 computes pLTV internally) | Integer, float | Predicted lifetime value of a subscriber as defined by the advertiser. |
| `DLV - search_string` | `search_string` | `search_term` | String | Used with the `Search` event. The string entered by the user. |
| `DLV - status` | `status` | — | Boolean | Used with `CompleteRegistration` to show registration status. Optional. |
| `DLV - value` | `value` | `value` | Integer or float | The value of a user performing this event to the business. |
| — | `delivery_category` | `shipping_tier` | String | Type of delivery for a purchased product: `in_store`, `curbside`, or `home_delivery`. |
| — | — (no Meta equivalent) | `transaction_id` | String | Unique ID for the transaction. Required for GA4 `purchase` and `refund` events. |
