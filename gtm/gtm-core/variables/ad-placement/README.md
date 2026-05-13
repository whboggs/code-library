# Ad Placement

Captures the `utm_placement` URL parameter on a visitor's first pageview and persists it across the session, so it's available when the conversion happens later.

## What it does

Most ad platforms expose a placement-level breakdown (e.g., Meta's Audience Network vs. Facebook Mobile Feed, Google's top-of-page vs. Display Network). When you tag your ad URLs with `utm_placement=Audience_Network_Native`, this script:

1. Captures the value from the URL on the first pageview
2. Stores it in `sessionStorage` so it survives multi-page funnels
3. Pushes it to `dataLayer` on every pageview where a value is available

The result: when a lead form fires on page 4 of the funnel, your conversion still knows the original placement.

## What this script outputs

| Layer | Key | Value example |
|---|---|---|
| dataLayer | `ad_placement` | `Audience_Network_Native` |
| sessionStorage | `mt_ad_placement` | `Audience_Network_Native` |

The script is platform-agnostic — `utm_source` already tells you which platform sent the visitor. This just captures whatever placement string was passed.

## Installation

This script is loaded by the Marketing Toolkit bootstrap. You don't install it directly.

1. Make sure you've installed [GTM Core Config](../../bundle/) first
2. In your `mtConfig`, set:

```javascript
window.mtConfig = {
  ad_placement: true
};
```

3. Save, preview, and publish your GTM container

## Setting up the Data Layer Variable

In GTM, create a new variable:

- **Type:** Data Layer Variable
- **Name:** `DLV - Ad Placement`
- **Data Layer Variable Name:** `ad_placement`
- **Set Default Value:** `(not set)` (recommended)

## Using the value

### In a GA4 Event tag

Add an event parameter:

- **Parameter Name:** `ad_placement`
- **Value:** `{{DLV - Ad Placement}}`

### In a Meta Conversions API tag

Add to the custom_data object:

- **Property Name:** `ad_placement`
- **Property Value:** `{{DLV - Ad Placement}}`

## How to tag your ads

For this script to capture anything, your ad URLs need to include `utm_placement`. Recommended values:

**Meta Ads** — use Meta's placement macros in your URL parameters:
```
utm_placement={{placement}}
```

**Google Ads** — use ValueTrack parameters:
```
utm_placement={network}_{adgroupid}
```

Set this up at the campaign or ad set level so all click-throughs get tagged.

## Known limitations

- Tags that fire on initial `Page View` (not `DOM Ready`) may race the script — set a default value on your DLV to handle this cleanly
- Older browsers without `URLSearchParams` support (IE11 and earlier) will silently fall back to no value
- `sessionStorage` is blocked in some private browsing modes — script gracefully falls back to URL-only attribution

## Disclaimer

This script is provided as-is under the MIT License. Test thoroughly in your own setup before relying on it for revenue attribution.

---

**Created by W.H. Boggs** — [whboggs.com](https://whboggs.com)
[→ Free Meta Ads audit](https://whboggs.com/audit)
