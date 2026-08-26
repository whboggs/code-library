---
name: mtk-attribution-setup
description: Sets up MTK Attribution on a client website — installing the tag, building the field map, and adding the hidden form fields that carry attribution data into the CRM. Use this skill whenever the user says "set up MTK Attribution", "install MTK on [client]", "add the attribution fields", "what fields do I add to this form", "add MTK to Webflow / Wix / Squarespace / Gravity Forms / Elementor / Jotform / GoHighLevel / Contact Form 7 / Zoho / Framer", "the attribution fields are coming through empty", "they already use Attributer", "the form already has UTM fields", "can we reuse the fields that are already there", or any close variant where MTK Attribution is being installed on or wired into a site or form. Always use this skill for these requests — it fetches the current field list from boggsmtk.com rather than carrying its own copy, because the field names and labels must match exactly and guessing them silently breaks capture.
---

# MTK Attribution — setup

Install MTK Attribution on a site and wire its data into the client's forms.

## Read the live docs first

This file is a working reference, not the source of truth. The install steps
are platform-specific and change; **always open the relevant guide on the site
before giving setup instructions.**

**Docs hub:** https://www.boggsmtk.com/products/attribution/docs

Platform install guides — `https://www.boggsmtk.com/products/attribution/docs/<slug>`:

| Platform | Slug | Method |
|---|---|---|
| Webflow | `webflow` | Set field names directly — the tag matches by name |
| Wix | `wix` | React-controlled forms — match by field title plus a helper script |
| Squarespace | `squarespace` | Hidden fields prefilled via `SQF_` URL params — companion script |
| Gravity Forms | `gravity-forms` | Drop a token into each field's Default Value |
| Elementor | `elementor` | Paste the token into a Hidden field's Default Value |
| Contact Form 7 | `contact-form-7` | Paste the hidden-input block into the form template |
| Jotform | `jotform` | Source Code embeds fill directly; iframe embeds via companion script |
| Zoho Forms | `zoho-forms` | Iframe embeds — Field Aliases plus the companion script |
| GoHighLevel | `gohighlevel` | Inline embeds fill directly; iframe embeds via companion script |
| Framer | `framer` | Set field names in the form — the tag matches by name |
| Custom HTML | `custom-html` | Name hidden inputs, or read values in JS |
| Other platforms | `other` | The universal method for any site rendering a real form |

Reference docs:

- **What MTK Attribution captures** — `/products/attribution/docs/what-mtk-attribution-captures`
- **How MTK Attribution categorizes** — `/products/attribution/docs/how-mtk-attribution-categorizes`
- **Data source reference** (what every source captures) — `/products/attribution/docs/data-source-reference`
- **Recommended UTM parameters** — `/products/attribution/docs/recommended-utm-parameters`
- **Troubleshooting** — `/products/attribution/troubleshooting`

The field map for a specific client lives in the dashboard at
`https://app.boggsmtk.com` under that client's license. It can be exported as
CSV from the config screen and handed to a developer.

## Setup sequence

1. **License** — create or open the client's Attribution license in the
   dashboard. A new license ships with the standard field map already saved,
   so the tag captures out of the box.
2. **Install the tag** — follow the platform guide above. Usually GTM, but
   some platforms take the snippet directly.
3. **Confirm the field map** — the dashboard config screen is what the tag
   actually reads. Toggle off anything the client doesn't need; leave the rest.
4. **Add the form fields** — hidden fields on every form that should carry
   attribution. Fetch the field reference first (below); naming rules below. First check whether the forms already
   carry Attributer or `utm_*` fields; if they do, remap those instead of
   duplicating them — see "Reusing fields that are already there".
5. **Verify** — submit a test lead and confirm values land.

## Naming rules — this is where setups break

Two different strings, and they are not interchangeable.

**The visible Label is human-readable and never carries an "MTK" prefix.**
Use `First Channel`, not `MTK First Channel`. Click IDs and Meta cookie fields
stay lowercase — `gclid`, `fbc` — because they are wire identifiers, not prose.
These labels are what a client sees in a lead email, so they should read like
field names, not like internal keys.

**The HTML `name` attribute must be exactly the `mtk_*` string.** This one is
not cosmetic — the tag matches fields by this name and fills them. Change a
character and the field goes empty. `mtk_first_channel` is required to be
literally `mtk_first_channel`. Take every name from the fetched field
reference, never from memory.

**On platforms where the label doubles as the identifier** (Squarespace, Wix),
use the Label column — that is precisely what it is for.

**Where you cannot set a field's name** (Gravity Forms hard-assigns `input_N`,
and others behave the same), paste the **Token** into the field's Default
Value instead. The tag replaces it with the resolved value on page load and
again at submit.

## Fields — fetch them, never recall them

**This skill does not carry the field list.** Field names, tokens, and data
sources change as MTK gains fields, and a copy pasted into a skill goes stale
silently: the names stop matching, the form fills nothing, and no error
surfaces anywhere. So the list lives in one place and is fetched at run time.

**Before naming a single field, fetch:**

```
https://www.boggsmtk.com/products/attribution/docs/fields.md
```

Raw Markdown, rendered straight from the live field map. It gives you, per
field: the visible **Field Name**, the **HTML Name** the tag matches on, the
**Token** for Default-Value platforms, the **Data Source**, and what each
source captures — grouped as query sources, cookies & click IDs, and insights,
plus the handful that are not in the standard set.

### If the fetch fails

Do not reconstruct the list from memory and do not guess a field name — that
is the failure this skill exists to prevent. Instead, ask the user for the
field map directly: the dashboard's **Export CSV** button on the field-map
screen dumps the live list as a spreadsheet, with the same columns. That is a
better answer anyway; see below.

### The client's own map beats the standard one

The fetched file is the **standard** map — what a new license ships with. A
particular client's map can differ: rows toggled off, renamed, or repointed at
different data sources. When it matters — a field is coming through empty, or
you are about to tell someone what to put on their form — read that client's
actual map rather than the standard one.

In order of authority:

1. **That client's field map**, from the dashboard at `https://app.boggsmtk.com`
   under their license, or the CSV exported from it.
2. **The standard map**, fetched from the URL above.
3. **Stop and ask.** Never a guess.

## Reusing fields that are already there — Attributer and UTMs

A site that already runs Attributer, or that already has hidden `utm_*` inputs
on its forms, does not arrive empty. Those fields are already columns on the
CRM record, already in saved reports, already firing automations. **Before you
add the full set of new fields, check what is already on the form and try to
remap it.**
Point MTK at the names that are already there and the same columns keep
filling — from MTK now, with no CRM rework and no history gap.

Remap to the **Last** fields. Both an Attributer value and a bare `utm_*`
hidden field describe the visit that produced the lead, so `last.*` is the
like-for-like swap. (If a client's reporting was built on first-touch, use the
`first.*` twin instead — same mechanics, same table, different prefix.)

### Take the old tool out first

Remove Attributer — or whatever is filling those fields — before MTK goes
live. Two prefill scripts competing over one input is the classic failure:
whichever runs last wins, results flip between submissions, and on Squarespace
the two rounds of URL-parameter reloads compound into extra pageviews. One
filler per field.

### The three ways to remap

The field map is a list of **HTML Name → Data Source** rows and both columns
are free text, so the remap happens in the dashboard, not on the form.

- **Where you can name fields** — find the MTK row for the equivalent value and
  **overwrite its HTML Name** with the name the form actually uses (`Channel`,
  `utm_source`, whatever it is). The data source stays put; only the name the
  tag hunts for changes. The form is never touched.
- **Where fields fill by Default Value** (Gravity Forms, Elementor, and the
  other token platforms) — leave the field map alone and **swap the old tool's
  token for MTK's** in the field's existing Default Value: `[channel]` becomes
  `[mtk:last.channel]`.
- **When the client wants both names** — `+ Add field`, name the new row for
  the existing field, and point it at the same data source as the `mtk_*` row.
  Two rows, one value, both fill.

Read the **rendered** `name` attribute off the live form, not the label in the
form builder. Elementor and friends show you `Channel` and emit
`form_fields[field_a1b2c3]`; the tag matches on what is in the HTML, character
for character.

### Attributer → MTK

| Attributer field | Its token | MTK data source |
|---|---|---|
| Channel | `[channel]` | `last.channel` |
| Channel Drilldown 1 | `[channeldrilldown1]` | `last.source` |
| Channel Drilldown 2 | `[channeldrilldown2]` | `last.campaign` |
| Channel Drilldown 3 | `[channeldrilldown3]` | `last.term` |
| Landing Page | `[landingpage]` | `last.landing_page` |
| Landing Page Group | `[landingpagegroup]` | `last.landing_page_group` |

**The three drilldowns are a starting guess, not a mapping — confirm them with
the user before applying.** Attributer fills a drilldown from whatever UTMs
that client actually sends, and falls back to its own derived values when they
send none, so what is really sitting in `Channel Drilldown 2` varies from
account to account: campaign name on one, ad group on another, `No Campaign` on
a third, something bespoke on a fourth. The row above is what it holds by
default, and the default is often wrong.

So do not apply the drilldown rows blind. Instead:

1. **Look at real values first.** Pull a handful of recent leads out of the CRM
   and read what is actually in each drilldown column. Two minutes of real data
   beats any table here.
2. **Ask the user what each drilldown means to them**, and what their reporting
   reads out of it — quote back the values you found. Somebody who groups
   pipeline by ad group out of Drilldown 3 needs a different mapping than
   somebody who reads keywords out of it.
3. **Then map**, from the dimension list in the field reference:
   `last.source`, `last.medium`, `last.campaign`, `last.term`, `last.content`,
   `last.ad_placement`, `last.channel`.

If the values are mixed — some leads carrying campaign names and some carrying
`No Campaign` — say so and let the user decide whether the column is worth
reusing at all. A column that means two things is often better replaced by a
clean `mtk_last_campaign` than remapped.

`Channel`, `Landing Page`, and `Landing Page Group` are safer: they are
derived by Attributer the same way for everyone, so they do not need the same
interrogation. They still carry the value-shape changes below.

Three shape changes to warn the client about, because the column name survives
the swap and the values inside it do not:

- **Channel wording differs.** MTK emits `Direct`, `Email`, and `Campaign`
  where Attributer wrote `Direct Traffic`, `Email Marketing`, and
  `Other Campaigns`, and MTK has no `Display` or `Affiliates` bucket. Anything
  downstream matching those strings exactly — CRM filters, workflow triggers,
  report groupings, pivot tables — needs its values updated.
- **Landing Page is a path, not a URL.** `last.landing_page` is
  `/pricing`; Attributer stored the full URL. There is no full-landing-URL
  data source (`page.url` is the *conversion* page), so say so rather than
  substituting it.
- **`No Campaign` / `No Terms` become empty.** Attributer writes those literal
  strings when a UTM is missing; MTK leaves the field empty instead. A report
  that counts `No Campaign` rows silently drops to zero rather than erroring.

### Loose UTM fields → MTK

| Existing field name | MTK data source |
|---|---|
| `utm_source` | `last.source` |
| `utm_medium` | `last.medium` |
| `utm_campaign` | `last.campaign` |
| `utm_term` | `last.term` |
| `utm_content` | `last.content` |
| `referrer` | `last.referrer` |
| `landing_page` | `last.landing_page` |
| `gclid` | `last_paid.gclid` |
| `gbraid` / `wbraid` / `msclkid` | `last_paid.gbraid` / `last_paid.wbraid` / `last_paid.msclkid` |
| `fbclid` | `param:fbclid` |
| anything else off the URL, e.g. `utm_id` | `param:utm_id` |

**Do not map a `utm_*` field to `param:utm_source`.** `param:` reads the live
URL only, so it fills on the landing page and empties on the next click —
which is the bug most homegrown UTM-capture scripts already have. `last.*` is
stored on the visit and survives every page and every return, and fixing that
silently is most of the value of the remap.

The click IDs keep their standard sources for the reason the fetched field
reference gives: `last_paid.*` for Google and Microsoft so a lead who returns
direct still carries the ID that earned the credit, and `param:fbclid` for
Meta.

### What remapping does not cover

Six or so fields have a predecessor. The rest do not — every `first.*` value,
the journey string, session and pageview counts, paid-touch counts and timing,
and the conversion timestamps. Add those as new fields the normal way. Remap
what the CRM already reads; add the rest alongside it.

After remapping, verify each reused field the same way as a new one — an
overwritten HTML Name that is off by a character fails exactly as silently.

## Carrying page values into a form

To capture something the tag cannot know by itself — a product title, a
listing ID, any GTM variable — add a field with the data source `dl:your_key`
and push that key to the dataLayer. The dashboard shows a ready-made tag for
doing the pushing.

## Verifying

1. Load the site with a test campaign URL, e.g.
   `?utm_source=google&utm_medium=cpc&utm_campaign=test&gclid=TEST123`.
2. Check the `mtk_attribution` dataLayer event fires with the fields populated.
3. Submit a test lead and confirm the values arrive in the CRM.
4. Empty fields are almost always a name mismatch — compare the form's
   HTML `name` against the field reference, character for character. Fetch it
   again rather than working from what you remember of it.
5. For anything else, work the troubleshooting page:
   https://www.boggsmtk.com/products/attribution/troubleshooting

Set timezone on the license to the client's GA4 / ad-account timezone, or the
datetime fields render against the visitor's clock instead.

## Keeping this skill current

**This file is handed to customers, who run it in their own Claude.** A wrong
detail here produces an empty field on a client's form with no error anywhere,
in an account nobody here is watching — so it has to stay correct without
anyone remembering to update it.

That is why the field list is fetched rather than written down. **Do not paste
the field list back into this file**, however convenient it looks: the moment
a field is added or renamed, every installed copy of this skill starts handing
out names that no longer match.

What is left here is prose that does not change with the field map. Update
this skill whenever:

- **A docs page is added, removed, or moved** — the URLs and platform slugs
  above are hardcoded, including
  `/products/attribution/docs/fields.md` itself. If that endpoint ever moves,
  this file is what points at it.
- **A platform's install method changes** (e.g. a form tool starts allowing
  real field names), which changes the Method column.
- **Attributer renames a field or changes a token**, which breaks the
  remapping table. Source of truth: https://help.attributer.io.

Field names, labels, data sources, and the count no longer live here — they
come from `DEFAULT_FIELD_MAP` and `FIELD_TITLES` in `src/lib/mtk.ts`
(`whboggs/boggsmtk`), rendered to the fetched endpoint on every deploy. Adding
a field there needs no change to this file. Same for a new engine data source
(`whboggs/mtk-attribution`, `src/engine.js`): it shows up in the reference on
its own.
