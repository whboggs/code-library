# GTM Starter Kit

A ready-to-import Google Tag Manager container that stands up a baseline of
form-submit conversion tracking for **GA4** and **Meta**, built on top of the
[GTM Essentials](../) variables. Import it into a fresh (or
existing) web container to get the tags, trigger, and variables below.

## Quick import

1. GTM → **Admin → Import Container**.
2. Choose `gtm-starter-kit.json`, select your workspace.
3. Pick **Merge** and **Rename conflicting** so nothing existing is overwritten.
4. Preview, then Confirm.

Placeholder account/container IDs (`0`) are remapped into whatever container you
import into. Everything lands in two folders: **GTM Starter Kit** (the tags,
trigger, and new variables) and **GTM Essentials** (the shared variables).

**Before it works, do these three things** (see [Setup](#setup-after-import)):
set your GA4 Measurement ID, make sure the Meta Pixel base is loaded, and make
sure something pushes `form_submit` to the dataLayer.

---

## What it creates

### Tags — folder *GTM Starter Kit*

| Tag | Type | Fires on | Notes |
|---|---|---|---|
| **Config - GA4** | Google tag | Initialization - All Pages | Tag ID = `{{GA4 - Measurement ID}}`. |
| **GA4 - Event - Form Submit** | GA4 Event | `form_submit` | Event name `ga4e_form_submit`, Measurement ID `{{GA4 - Measurement ID}}`, **Once per page**. Parameters below. |
| **Meta - Event - Lead - Form Submit** | Custom HTML | `form_submit` | Fires `fbq('track', 'Lead', …)` with page title / traffic source / ad placement. |
| **Conversion Linker** | Conversion Linker | All Pages | Improves Google Ads click-ID cookie durability. |

**GA4 - Event - Form Submit → event parameters:**

| Parameter | Value |
|---|---|
| `cjs_traffic_source` | `{{cJS - Traffic Source}}` |
| `cjs_ad_placement` | `{{cJS - Ad Placement}}` |
| `cjs_fbc_exists` | `{{cJS - Boolean - _fbc Exists}}` |
| `cjs_fbp_exists` | `{{cJS - Boolean - _fbp Exists}}` |
| `cjs_fbclid_exists` | `{{cJS - Boolean - fbclid Exists}}` |
| `cjs_gcl_aw_exists` | `{{cJS - Boolean - _gcl_aw Exists}}` |
| `cjs_uetmsclkid_exists` | `{{cJS - Boolean - _uetmsclkid Exists}}` |
| `cjs_ttp_exists` | `{{cJS - Boolean - _ttp Exists}}` |
| `cjs_twclid_exists` | `{{cJS - Boolean - _twclid Exists}}` |
| `cjs_li_fat_id_exists` | `{{cJS - Boolean - li_fat_id Exists}}` |

### Trigger — folder *GTM Starter Kit*

- **form_submit** — Custom Event, event name `form_submit` (fires on every
  `form_submit` dataLayer event). Drives both the GA4 event and Meta tags.

### Variables — folder *GTM Starter Kit*

- **GA4 - Measurement ID** — Constant, `G-0000000000`. **Replace with your real
  Measurement ID** — every GA4 tag reads from this one place.

> **User-Provided Data variable — add this one by hand.** GTM's User-Provided
> Data variable has no stable container-export type, so it isn't in the JSON.
> Add it after import: **Variables → New → Variable Configuration →
> User-Provided Data**, set it to **Automatic**, and name it `User Provided
> Data`. It's a two-click add and pairs with GA4 / Google Ads enhanced
> conversions.

### Built-in variables enabled

Click Classes / Element / ID / Target / Text / URL, Event, Form Classes /
Element / ID / Target / Text / URL, HTML ID, Page Hostname / Path / URL,
Referrer.

---

## Included from GTM Essentials

These variables come from the [**GTM Essentials**](../) toolkit
entry and are bundled here (folder *GTM Essentials*) so the kit is self-contained.
Full details and source files are in
[`gtm-essentials/README.md`](../README.md).

> **Maintenance — keep this in sync with GTM Essentials.** The variables below
> are **copies** baked into `gtm-starter-kit.json`. Whenever GTM Essentials gains
> or changes a variable, refresh this export too so the copies don't drift. (A
> `.json` file can't carry an inline comment, so this reminder lives here.)

- **First-party cookie variables** (`1PC - …`): `_fbc`, `_fbp`, `fbclid`,
  `_gcl_aw`, `_uetmsclkid`, `_ttp`, `_twclid`, `li_fat_id`.
- **Existence booleans** (`cJS - Boolean - <cookie> Exists`) — one per cookie
  above; each returns `!!{{1PC - <cookie>}}`.
- **`cJS - Traffic Source`** — last-touch traffic source
  ([source](../variables/cjs-traffic-source/cjs-traffic-source.js)).
- **`cJS - Ad Placement`** — `utm_placement`, persisted per session
  ([source](../variables/cjs-ad-placement/ad-placement.js)).
- **`cJS - Page Title`**, **`cJS - Post Title`**, **`cJS - Post ID`**,
  **`cJS - Form ID`** — page/post/form context
  ([sources](../variables/)).

---

## Setup after import

1. **GA4 - Measurement ID** → set the Constant to your `G-XXXXXXXXXX`.
2. **Meta Pixel base** must load before *Meta - Event - Lead - Form Submit*
   (the tag calls `fbq(...)`, so `fbq` has to exist). Add your Pixel base tag,
   ideally gated on consent.
3. **`form_submit` event** must be pushed to the dataLayer. The toolkit's
   [Elementor Listener](../../wordpress/elementor/elementor-listener-form-submit/)
   pushes exactly this event; use it (or your platform's equivalent listener).

## Things to verify on import

- **GA4 event Measurement ID** — confirm the tag's Measurement ID field resolves
  to `{{GA4 - Measurement ID}}` (or point it at the *Config - GA4* Google tag).
- **User-Provided Data** — not in the JSON (see above); add it via the UI.
- **Trigger mapping** — *Config - GA4* should fire on **Initialization - All
  Pages** and *Conversion Linker* on **All Pages**; re-select if either didn't
  map.

## Suggestions

- **Firing option:** *Once per page* means only the **first** form submit on a
  page load sends the GA4 event. If a page can produce multiple submits, switch
  the GA4 event (and consider the Meta tag) to *Once per event*.
- **Booleans as user properties:** the `*_exists` flags describe the visitor's
  cookies, not the event — consider sending them as GA4 **user properties**
  instead of event parameters.
- **Consent:** for Consent Mode setups, fire *Conversion Linker* on **Consent
  Initialization - All Pages**, and gate the Meta tag on marketing consent.
