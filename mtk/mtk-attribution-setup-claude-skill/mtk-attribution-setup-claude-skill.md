---
name: mtk-attribution-setup
description: Sets up MTK Attribution on a client website — installing the tag, building the field map, and adding the hidden form fields that carry attribution data into the CRM. Use this skill whenever the user says "set up MTK Attribution", "install MTK on [client]", "add the attribution fields", "what fields do I add to this form", "add MTK to Webflow / Wix / Squarespace / Gravity Forms / Elementor / Jotform / GoHighLevel / Contact Form 7 / Zoho / Framer", "the attribution fields are coming through empty", or any close variant where MTK Attribution is being installed on or wired into a site or form. Always use this skill for these requests — the field names and labels must match exactly, and guessing them silently breaks capture.
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
   attribution. Naming rules below.
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
literally `mtk_first_channel`.

**On platforms where the label doubles as the identifier** (Squarespace, Wix),
use the Label column — that is precisely what it is for.

**Where you cannot set a field's name** (Gravity Forms hard-assigns `input_N`,
and others behave the same), paste the **Token** into the field's Default
Value instead. The tag replaces it with the resolved value on page load and
again at submit.

## Fields

41 fields. Legacy spellings (`mtk_ft_*`, `mtk_lt_*`, `mtk_lt_gclid`,
`mtk_summary`, and friends) still resolve for old forms but must **not** be
used on anything new — always use the names below.

Deliberately excluded from this list: `mtk_attribution_summary` (the
all-fields roll-up, for CRMs that only accept one field) and
`mtk_journey_json` (the machine-readable journey). Add either by hand if a
client specifically needs it.

### Query sources

| Label | Field name (HTML `name`) | Token | Data source |
|---|---|---|---|
| First Ad Placement | `mtk_first_ad_placement` | `[mtk:first.ad_placement]` | `first.ad_placement` |
| Last Ad Placement | `mtk_last_ad_placement` | `[mtk:last.ad_placement]` | `last.ad_placement` |
| First Campaign | `mtk_first_campaign` | `[mtk:first.campaign]` | `first.campaign` |
| Last Campaign | `mtk_last_campaign` | `[mtk:last.campaign]` | `last.campaign` |
| First Channel | `mtk_first_channel` | `[mtk:first.channel]` | `first.channel` |
| Last Channel | `mtk_last_channel` | `[mtk:last.channel]` | `last.channel` |
| First Content | `mtk_first_content` | `[mtk:first.content]` | `first.content` |
| Last Content | `mtk_last_content` | `[mtk:last.content]` | `last.content` |
| First Landing Page | `mtk_first_landing_page` | `[mtk:first.landing_page]` | `first.landing_page` |
| Last Landing Page | `mtk_last_landing_page` | `[mtk:last.landing_page]` | `last.landing_page` |
| First Landing Page Group | `mtk_first_landing_page_group` | `[mtk:first.landing_page_group]` | `first.landing_page_group` |
| Last Landing Page Group | `mtk_last_landing_page_group` | `[mtk:last.landing_page_group]` | `last.landing_page_group` |
| First Medium | `mtk_first_medium` | `[mtk:first.medium]` | `first.medium` |
| Last Medium | `mtk_last_medium` | `[mtk:last.medium]` | `last.medium` |
| First Query | `mtk_first_query` | `[mtk:first.query]` | `first.query` |
| Last Query | `mtk_last_query` | `[mtk:last.query]` | `last.query` |
| First Referrer | `mtk_first_referrer` | `[mtk:first.referrer]` | `first.referrer` |
| Last Referrer | `mtk_last_referrer` | `[mtk:last.referrer]` | `last.referrer` |
| First Source | `mtk_first_source` | `[mtk:first.source]` | `first.source` |
| Last Source | `mtk_last_source` | `[mtk:last.source]` | `last.source` |
| First Term | `mtk_first_term` | `[mtk:first.term]` | `first.term` |
| Last Term | `mtk_last_term` | `[mtk:last.term]` | `last.term` |

`first.*` is frozen at the visitor's first ever visit. `last.*` refreshes each
new session.

### Cookies & click IDs

| Label | Field name (HTML `name`) | Token | Data source |
|---|---|---|---|
| gclid | `mtk_gclid` | `[mtk:last_paid.gclid]` | `last_paid.gclid` |
| gbraid | `mtk_gbraid` | `[mtk:last_paid.gbraid]` | `last_paid.gbraid` |
| wbraid | `mtk_wbraid` | `[mtk:last_paid.wbraid]` | `last_paid.wbraid` |
| msclkid | `mtk_msclkid` | `[mtk:last_paid.msclkid]` | `last_paid.msclkid` |
| fbclid | `mtk_fbclid` | `[mtk:param:fbclid]` | `param:fbclid` |
| fbc | `mtk_fbc` | `[mtk:cookie:_fbc]` | `cookie:_fbc` |
| fbp | `mtk_fbp` | `[mtk:cookie:_fbp]` | `cookie:_fbp` |

The Google and Microsoft click IDs read from `last_paid.*` — the click ID of
the most recent **paid** touch, which stays put through every direct and
organic session afterward. That is what offline conversion import needs: a
lead who clicked the ad and came back direct three weeks later still carries
the ID that earned the credit. Do not swap these to `last.*`; that empties as
soon as the visitor returns directly.

`fbclid` is deliberately different. Meta appends `fbclid` to organic links
too, so a bare `fbclid` is classified Organic Social and never reaches the
paid record — `last_paid.fbclid` would be narrower, not better. For Conversions
API matching, `param:fbclid` plus the `_fbc` cookie is the right pair.

### Insights

| Label | Field name (HTML `name`) | Token | Data source |
|---|---|---|---|
| Journey String | `mtk_journey_string` | `[mtk:journey.string]` | `journey.string` |
| Session Count | `mtk_session_count` | `[mtk:session.count]` | `session.count` |
| Pageview Count | `mtk_pageview_count` | `[mtk:pageview.count]` | `pageview.count` |
| Paid Touch Count | `mtk_paid_touch_count` | `[mtk:paid_touch_count]` | `paid_touch_count` |
| Last Paid Touch | `mtk_last_paid_touch` | `[mtk:last.paid_touch]` | `last.paid_touch` |
| Time Since Last Paid Touch | `mtk_time_since_last_paid_touch` | `[mtk:time_since_last_paid_touch]` | `time_since_last_paid_touch` |
| Page Path | `mtk_page_path` | `[mtk:page.path]` | `page.path` |
| Page URL | `mtk_page_url` | `[mtk:page.url]` | `page.url` |
| Time To Conversion | `mtk_time_to_conversion` | `[mtk:time_to_conversion]` | `time_to_conversion` |
| Conversion Unix | `mtk_conversion_unix` | `[mtk:conversion_unix]` | `conversion_unix` |
| Conversion Datetime | `mtk_conversion_datetime` | `[mtk:conversion_datetime]` | `conversion_datetime` |
| Custom Conversion Time | `mtk_custom_conversion_time` | `[mtk:custom_conversion_time]` | `custom_conversion_time` |

`Conversion Datetime` is the format Google Ads offline conversion import
expects. `Custom Conversion Time` is shaped by per-license options in the
dashboard, for CRM and spreadsheet imports.

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
   HTML `name` against the table above, character for character.
5. For anything else, work the troubleshooting page:
   https://www.boggsmtk.com/products/attribution/troubleshooting

Set timezone on the license to the client's GA4 / ad-account timezone, or the
datetime fields render against the visitor's clock instead.

## Keeping this skill current

**This file duplicates information that lives elsewhere. When any of it
changes, update this file in the same change.** It goes stale silently — a
wrong field name here produces an empty field on a client's form with no
error anywhere.

Update this skill whenever:

- **A field name, label, or data source changes**, or a field is added or
  removed. Source of truth: `DEFAULT_FIELD_MAP` and `FIELD_TITLES` in
  `src/lib/mtk.ts` in the `whboggs/boggsmtk` repo. The dashboard's
  **Export CSV** button on the field-map screen dumps the current, live list.
- **A docs page is added, removed, or moved** — the URLs and platform slugs
  above are hardcoded.
- **A platform's install method changes** (e.g. a form tool starts allowing
  real field names), which changes the Method column.
- **The engine gains or renames a data source** — `whboggs/mtk-attribution`,
  `src/engine.js`.

The 41 fields listed here are the standard map minus `mtk_attribution_summary`
and `mtk_journey_json`; if the standard map changes size, this count changes
with it.
