# MTK Attribution — GTM Variables

A Google Tag Manager container export that sets up every MTK Attribution data
source as a Data Layer Variable, filed under an **MTK - Attribution** folder,
plus the Custom Event trigger that fires them.

## What's inside

`mtk-attribution.json` contains:

- **41 Data Layer Variables** — one per MTK source: first- and last-touch
  dimensions (channel, source, medium, campaign, term, content, ad placement,
  landing page, landing page group, query, referrer), click IDs (gclid,
  gbraid, wbraid, msclkid, fbclid), Meta cookies (`_fbc`, `_fbp`), the
  journey (journey string, journey JSON, session count, pageview count),
  paid-touch insights (paid touch count, last paid touch, time since last
  paid touch), conversion timing (time to conversion, Unix, datetime, custom
  time), and the all-fields Attribution Summary.
- **1 Custom Event trigger** — `mtk_attribution`, the tag's page-load event.
- A GTM **folder** named `MTK - Attribution`; every variable and the trigger
  are filed under it.

Variables follow the naming convention `MTK - <Dimension> - <Qualifier>`, e.g.
`MTK - Channel - First Touch`, `MTK - Source - Last Touch`, `MTK - gclid -
Google`. Each variable reads the canonical dataLayer key of the same name in
the default field map — `mtk_first_channel`, `mtk_last_source`, `mtk_gclid`,
and so on.

## Installation

1. In GTM, go to **Admin → Import Container**.
2. Choose `mtk-attribution.json` and select your workspace.
3. Set **Merge** and **Rename conflicting** so nothing existing is overwritten.
4. Preview the changes, then Confirm. You'll get an **MTK - Attribution**
   folder with all 41 variables and the trigger.

## Using them

- Fire your GA4 / Meta CAPI / Google Ads tags on the **MTK - mtk_attribution -
  Page Load Event** trigger so the variables are populated when the tags read
  them.
- Reference any value in a tag as `{{MTK - Channel - First Touch}}`.

## Requirements

The MTK Attribution tag must be loaded on the page — it pushes the
`mtk_attribution` dataLayer event, and these variables read that event. They
work whether or not the tag is also filling hidden form fields.

The dataLayer keys these variables read are the **canonical field names**
(`mtk_first_*` / `mtk_last_*`, `mtk_journey_*`, `mtk_conversion_unix`, …). If
a license's field map was saved before the canonical-naming rename (old
`mtk_ft_*` / `mtk_lt_*` spellings), re-save the tag config in the dashboard —
it normalizes every legacy name to its canonical spelling — so the pushed keys
match these variables.

## Notes

The account and container IDs in the export are placeholders (`0`); GTM remaps
everything into whichever container you import into, so they don't need editing.
