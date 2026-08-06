# GTM Essentials – Variables Container Export

GTM Container Export (JSON)
Last updated: August 2026

---

## Overview

`gtm-essentials-variables.json` is a Google Tag Manager **container export**
that creates every GTM Essentials variable in one import — 22 variables, filed
under a **GTM Essentials** folder, plus GTM's standard built-in variables
switched on. Use it instead of building the variables one by one from the
sibling folders.

The individual Custom JavaScript sources it bundles each live in their own
folder under [`variables/`](../) with full documentation; this export is just
the fastest way to get all of them into a container at once.

---

## How to Import

1. GTM → **Admin → Import Container**.
2. Choose `gtm-essentials-variables.json` and select your workspace.
3. Pick **Merge** and **Rename conflicting** so nothing existing is
   overwritten.
4. Preview, then Confirm.

Placeholder account/container IDs (`0`) are remapped into whatever container
you import into, so the file works in any account.

---

## What It Creates

**First-party cookie readers** (1st-Party Cookie variables) — one `1PC -
<cookie>` per platform click-ID cookie:

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

**Existence booleans** (Custom JS) — `cJS - Boolean - <cookie> Exists`, one
per cookie above: `function() { return !!{{1PC - <cookie>}}; }`
([source](../cjs-boolean-cookie-exists/cjs-boolean-cookie-exists.js)).

**Session variables** (Custom JS):

- `cJS - Traffic Source` — last-touch traffic source
  ([source](../cjs-traffic-source/cjs-traffic-source.js)).
- `cJS - Ad Placement` — `utm_placement`, persisted per session
  ([source](../cjs-ad-placement/ad-placement.js)).

**Page / post / form context** (Custom JS):

- `cJS - Page Title` — `document.title`
  ([source](../cjs-page-title/cjs-page-title.js)).
- `cJS - Post Title` — the page's `.entry-title` / `h1`, falling back to
  `og:title` ([source](../cjs-post-title/cjs-post-title.js)).
- `cJS - Post ID` — the WordPress post/page ID from the `postid-…` /
  `page-id-…` body class ([source](../cjs-post-id/cjs-post-id.js)).
- `cJS - Form ID` — the `id` of the first `<form>` on the page
  ([source](../cjs-form-id/cjs-form-id.js)).

**Built-in variables enabled** — Click Classes / Element / ID / Target / Text
/ URL, Event, Form Classes / Element / ID / Target / Text / URL, HTML ID,
Page Hostname / Path / URL, and Referrer.

> *Analytics Client ID* is intentionally left out — it has no stable
> container-export type, so enable it by hand in **Configure** if you need it
> (one checkbox).

---

## Keeping It in Sync

This export and the [`gtm-starter-kit/`](../../gtm-starter-kit/) bundle both
carry copies of the variables in this directory. If you add, rename, or change
a variable source under [`variables/`](../), re-export this file and update
the Starter Kit too — otherwise the bundled copies drift from the documented
sources.
