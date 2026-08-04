# MTK Attribution — GTM Variables

A Google Tag Manager container export that sets up every MTK Attribution data
source as a Data Layer Variable, filed under an **MTK - Attribution** folder,
plus the Custom Event trigger that fires them.

## What's inside

`mtk-attribution.json` contains:

- **32 Data Layer Variables** — one per MTK source: first- and last-touch
  dimensions (channel, source, medium, campaign, term, content, placement,
  landing page, landing query), click IDs (gclid, gbraid, wbraid, msclkid,
  fbclid), Meta cookies (`_fbc`, `_fbp`), the journey (touch path, session
  count, pageview count), and conversion timing.
- **1 Custom Event trigger** — `mtk_attribution`, the tag's page-load event.
- A GTM **folder** named `MTK - Attribution`; every variable and the trigger
  are filed under it.

Variables follow the naming convention `MTK - <Dimension> - <Qualifier>`, e.g.
`MTK - Channel - First Touch`, `MTK - Source - Last Touch`, `MTK - gclid -
Google`.

## Installation

1. In GTM, go to **Admin → Import Container**.
2. Choose `mtk-attribution.json` and select your workspace.
3. Set **Merge** and **Rename conflicting** so nothing existing is overwritten.
4. Preview the changes, then Confirm. You'll get an **MTK - Attribution**
   folder with all 32 variables and the trigger.

## Using them

- Fire your GA4 / Meta CAPI / Google Ads tags on the **MTK - mtk_attribution -
  Page Load Event** trigger so the variables are populated when the tags read
  them.
- Reference any value in a tag as `{{MTK - Channel - First Touch}}`.

## Requirements

The MTK Attribution tag must be loaded on the page — it pushes the
`mtk_attribution` dataLayer event, and these variables read that event. They
work whether or not the tag is also filling hidden form fields.

## Notes

The account and container IDs in the export are placeholders (`0`); GTM remaps
everything into whichever container you import into, so they don't need editing.
