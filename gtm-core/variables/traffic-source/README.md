# cJS – Traffic Source

GTM Custom JavaScript Variable
Last updated: April 2026

---

## Overview

This GTM Custom JavaScript variable detects and returns the traffic source for a website visitor. It is designed to work for both lead generation (form submissions) and ecommerce (Purchase events) by populating a `traffic_source` or `source` custom parameter on conversion tags — most commonly the Meta Pixel Lead and Purchase events.

The variable uses **last-touch attribution within a session**: each new entry to the site with a fresh click ID or UTM overwrites the prior value, so the conversion is credited to the channel that most recently brought the user back. SessionStorage carries the resolved signals through multi-page funnels so attribution is preserved through popup forms on internal pages and multi-step checkouts.

---

## How It Works

### Detection Priority

The variable checks signals in the following order. The first match wins.

| Priority | Signal | Returns |
| --- | --- | --- |
| 1 | utm_medium=paid_social + utm_source=facebook | facebook_ads |
| 2 | utm_medium=paid_social + utm_source=instagram | instagram_ads |
| 3 | utm_medium=paid_social + utm_source=linkedin | linkedin_ads |
| 4 | utm_medium=paid_social + utm_source=tiktok | tiktok_ads |
| 5 | utm_medium=paid_social + any other source | {source}_ads |
| 6 | gclid in URL or sessionStorage | google_ads |
| 7 | _gcl_aw cookie present | google_ads |
| 8 | msclkid in URL or sessionStorage | microsoft_ads |
| 9 | ttclid in URL or sessionStorage | tiktok_ads |
| 10 | Any other utm_source present | utmSource_utmMedium (e.g. email_newsletter) |
| 11 | fbclid in URL or sessionStorage (no paid UTM) | facebook_organic |
| 12 | Referrer contains google. | google_organic |
| 13 | Referrer contains bing. | bing_organic |
| 14 | Referrer contains yahoo. | yahoo_organic |
| 15 | Referrer contains duckduckgo. | duckduckgo_organic |
| 16 | Referrer contains facebook. or fb. | facebook_organic |
| 17 | Referrer contains instagram. | instagram_organic |
| 18 | Referrer contains linkedin. | linkedin_organic |
| 19 | Referrer contains twitter. or x.com | twitter_organic |
| 20 | Referrer contains youtube. | youtube_organic |
| 21 | Referrer contains reddit. | reddit_organic |
| 22 | Referrer contains pinterest. | pinterest_organic |
| 23 | Referrer contains tiktok. | tiktok_organic |
| 24 | No referrer or same-domain referrer | direct |
| 25 | Anything else | referral |

### Attribution Model

This variable uses **last-touch attribution within a session**. Each pageview captures any fresh signals from the URL (click IDs, UTMs) and stores them in sessionStorage, overwriting any prior values. The most recent identifiable source wins.

This means:
- A user who clicks a Google Ad, leaves, and returns via a Facebook Ad will be attributed to Facebook on conversion.
- A user who clicks a Facebook Ad, browses to checkout over multiple pages, and converts is still attributed to Facebook because sessionStorage carries the click ID through the funnel.
- A new browser session (closed tab, new browser) starts fresh — no localStorage means no cross-session attribution carryover.

To switch to first-touch attribution: change the click ID and UTM capture blocks to only write if a value is not already stored, and add a localStorage layer for cross-session persistence.

### Funnel Persistence via SessionStorage

Without persistence, multi-page funnels would lose attribution. By the second page of a checkout, `document.referrer` becomes your own domain, and click IDs disappear from the URL once the user navigates internally.

The variable stores the following in sessionStorage on the landing page:
- gclid, msclkid, fbclid, ttclid (raw click IDs)
- utm_source, utm_medium
- original_referrer (the first external referrer seen this session)

On every subsequent page in the same tab, these stored values are used in the resolution logic, ensuring consistent attribution from landing through conversion.

---

## Why UTMs Are Required for Paid Social

Facebook (and Instagram) append `fbclid` to all outbound links — both paid ads and organic posts. Relying on `fbclid` or the `_fbc` cookie alone would incorrectly label organic Facebook traffic as paid.

To distinguish paid from organic, paid social ad URLs must include UTMs following this convention:

| Channel | utm_source | utm_medium |
| --- | --- | --- |
| Facebook Ads | facebook | paid_social |
| Instagram Ads | instagram | paid_social |
| LinkedIn Ads | linkedin | paid_social |
| TikTok Ads (paid) | tiktok | paid_social |

Any click with `fbclid` that does NOT have `utm_medium=paid_social` is treated as `facebook_organic`. Without consistent UTM tagging on ad URLs, paid and organic Facebook traffic will be misattributed.

For Google, Microsoft, and TikTok, the platform-specific click IDs (`gclid`, `msclkid`, `ttclid`) are unique to paid traffic and don't have this collision problem. UTMs are optional for those channels but recommended for GA4 reporting consistency.

---

## Google Ads Attribution

Google Ads detection works in three layers:

1. **gclid in the URL** — present on the landing page when a user clicks a Google Ad.
2. **gclid in sessionStorage** — preserved from the landing page so Google Ads attribution survives multi-page funnels.
3. **_gcl_aw cookie** — set automatically by gtag.js when auto-tagging is enabled in Google Ads. This catches cases where `gclid` is stripped from the URL by redirects or link shorteners.

For the `_gcl_aw` cookie fallback to work, the Google Ads account must have auto-tagging enabled and gtag.js must be firing on the site. If only GTM is used without a Google Ads tag, this fallback won't work and `gclid` in the URL is the only signal.

---

## Lead Gen vs. Ecommerce Use

The same variable works for both conversion types because the underlying attribution problem is the same: a user enters with a source signal, navigates internally, and converts on a deeper page.

**For lead gen (popup forms, contact forms):**
- Used in Meta Pixel Lead event as `traffic_source` parameter
- Captures source even when the popup appears on a different page than the landing page

**For ecommerce (multi-step checkout):**
- Used in Meta Pixel Purchase event as `source` parameter
- Captures source through cart → checkout → confirmation flow

Both use cases benefit from the sessionStorage persistence layer — without it, attribution would collapse to `direct` on internal pages.

---

## Cross-Tab Behavior

SessionStorage is scoped to a single browser tab. If a user opens checkout in a new tab partway through a funnel, the new tab starts fresh and re-detects from the URL and referrer at that moment.

For most flows this is fine — the new tab usually opens with the source URL intact. If cross-tab persistence is required (e.g. multi-tab purchase comparison flows), add a localStorage layer that writes alongside sessionStorage and reads as a fallback.

---

## Known Limitations

- **No cross-session attribution.** Closing the browser ends the session. A user who visits via Facebook Ads on Monday and converts via direct on Wednesday will be attributed to direct on Wednesday. This is intentional last-touch behavior.
- **iOS Safari ITP** restricts cookie and storage lifetimes on Apple devices. The `_fbc` and `_gcl_aw` cookies may have shortened lifespans, which can affect Google Ads cookie fallback specifically.
- **fbclid on organic Facebook posts** will return `facebook_organic` correctly — but only because the variable specifically excludes `fbclid`-only signals from paid attribution. This is by design.
- **Same-domain navigation with no UTM signals** returns `direct`. If a user lands on a marketing landing page without UTMs, then navigates to checkout, the conversion is direct. UTM-tag your landing pages.
- **Referrer-based organic detection** relies on `document.referrer` being captured on the landing page and stored as `original_referrer`. If the landing page is reached via a redirect that strips the referrer, organic source detection fails.

---

## Usage in GTM

### Variable Setup

- **Variable type:** Custom JavaScript
- **Variable name:** cJS - Traffic Source
- **Return type:** String
