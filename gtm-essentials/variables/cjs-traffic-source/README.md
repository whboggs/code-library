# cJS – Traffic Source

GTM Custom JavaScript Variable
Last updated: September 2026

---

## Overview

This GTM Custom JavaScript variable detects and returns the traffic source for a website visitor as one flat string (`google_ads`, `facebook_ads`, `google_organic`, `newsletter_email`, `referral`, `direct`, …). It is designed to work for both lead generation (form submissions) and ecommerce (Purchase events) by populating a `traffic_source` or `source` custom parameter on conversion tags — most commonly the Meta Pixel Lead and Purchase events.

Its classification rules mirror the [MTK Attribution](https://boggsmtk.com/products/attribution/docs/how-mtk-attribution-categorizes) engine: the same click IDs, the same `utm_medium` values, the same referrer domain lists, and the same fresh-cookie rescue — collapsed to a single string instead of a separate channel and source. If a site runs both, the two agree on where a visit came from.

The variable uses **last-touch attribution within a tab session**: each new entry to the site with a fresh click ID or UTM replaces the prior value, so the conversion is credited to the channel that most recently brought the user in. SessionStorage carries the resolved value through multi-page funnels so attribution is preserved through popup forms on internal pages and multi-step checkouts.

---

## How It Works

### Detection Priority

The variable resolves an entry from that pageview's URL parameters, referrer, and platform cookies, walking the rules below in order. The first match wins. All comparisons are case-insensitive.

| Priority | Signal | Returns |
| --- | --- | --- |
| 1 | `gclid`, `gbraid`, or `wbraid` in URL, or `utm_medium=cpc` / `paid_search` with a Google (or no) `utm_source` | `google_ads` |
| 2 | `msclkid` in URL, or `utm_medium=cpc` / `paid_search` with `utm_source` = `bing` / `bingads` / `microsoft` | `microsoft_ads` |
| 3 | `utm_medium=cpc` / `paid_search` with any other `utm_source` | `{source}_ads` |
| 4 | `utm_medium=paid_social` | `{source}_ads` — `facebook_ads` when `utm_source` is missing |
| 5 | `ttclid` in URL | `tiktok_ads` |
| 6 | `utm_medium=email` | `{source}_email`, or `email` when `utm_source` is missing |
| 7 | Any other `utm_source` | `{source}_{medium}` (e.g. `partner_referral`), or `{source}` when there is no medium |
| 8 | Referrer host is a search engine (`google.`, `bing.`, `yahoo.`, `duckduckgo.`, `ecosia.`) | `{engine}_organic` — a Google referrer with a **fresh** `_gcl_aw` cookie upgrades to `google_ads` |
| 9 | Referrer host is a social network (`facebook.`, `fb.`, `instagram.`, `linkedin.`, `twitter.`, `x.com`, `t.co`, `youtube.`, `reddit.`, `pinterest.`, `tiktok.`), or `fbclid` in URL with any external referrer | `{network}_organic` — a Facebook/Instagram referrer with a **fresh** `_fbc` cookie and **no** `fbclid` in the URL upgrades to `facebook_ads` |
| 10 | Any other external referrer | `referral` |
| 11 | `fbclid` in URL with no referrer at all | `facebook_organic` |
| 12 | No signals, but a **fresh** `_gcl_aw` cookie | `google_ads` |
| 13 | No signals, but a **fresh** `_fbc` cookie | `facebook_ads` |
| 14 | Nothing identifying | `direct` |

`utm_source` values are normalized through a small alias table before they are used, so Meta's `{{site_source_name}}` values come out readable: `fb` → `facebook`, `ig` → `instagram`, `msg` → `messenger`, `an` → `audience_network`, `x` → `twitter`, `googleads` / `adwords` → `google`, `bingads` / `bing` → `microsoft`. Anything else is lower-cased and snake_cased (`Facebook Ads` → `facebook_ads`).

Referrer domains are matched against the referrer's **hostname only**, with label boundaries: `google.` matches `google.com` and `news.google.de` but not `notgoogle.com`; `x.com` matches `x.com` and `www.x.com` but not `wix.com`; `bing.` never matches `plumbing.com`. A referrer from the site's own hostname is internal navigation and never classifies.

### Attribution Model

This variable uses **last-touch attribution within a tab session**. The value is resolved once, on the pageview that brought the visitor in, and stored. A later pageview only re-resolves when:

- the URL carries a fresh campaign signal — any `utm_source`, `utm_medium`, `utm_campaign`, or any of `gclid`, `gbraid`, `wbraid`, `msclkid`, `fbclid`, `ttclid`; or
- the tab has been idle for more than 30 minutes (GA-style session timeout); or
- nothing is stored yet (first pageview in the tab, or storage was blocked).

Internal navigation never changes attribution — and neither does an external referrer on its own. A mid-checkout bounce through PayPal, Stripe, or an OAuth provider comes back with a foreign referrer and no campaign signal, and the stored paid source survives it.

This means:

- A user who clicks a Google Ad, leaves, and returns via a Facebook Ad will be attributed to Facebook on conversion — and vice versa. The newest signal always wins, whichever platform it came from.
- A user who clicks a Facebook Ad, browses to checkout over multiple pages, and converts is still attributed to Facebook because sessionStorage carries the resolved value through the funnel.
- A user who leaves the tab open overnight and comes back via organic search is re-resolved as organic search.
- A new browser session (closed tab, new browser) starts fresh — no localStorage means no cross-session attribution carryover.

To switch to first-touch attribution: skip the re-resolve when a value is already stored, and add a localStorage layer for cross-session persistence. (Or use MTK Attribution, which reports first touch, last touch, and the full journey.)

### Funnel Persistence via SessionStorage

Without persistence, multi-page funnels would lose attribution. By the second page of a checkout, `document.referrer` becomes your own domain, and click IDs disappear from the URL once the user navigates internally.

The variable stores a single key, `cjs_traffic_source`, holding the resolved value and the time of the last pageview: `{"v":"google_ads","t":1700000000000}`. Every pageview in the same tab reads the stored value and refreshes the timestamp, so a visitor who keeps navigating never times out.

---

## Why UTMs Are Required for Paid Social

Facebook (and Instagram) append `fbclid` to all outbound links — both paid ads and organic posts. Relying on `fbclid` or the `_fbc` cookie alone would incorrectly label organic Facebook traffic as paid.

To distinguish paid from organic, paid social ad URLs must include UTMs following this convention:

| Channel | utm_source | utm_medium |
| --- | --- | --- |
| Meta Ads (all placements) | `{{site_source_name}}` (`fb`, `ig`, `msg`, `an`) | paid_social |
| LinkedIn Ads | linkedin | paid_social |
| TikTok Ads (paid) | tiktok | paid_social |

Any click with `fbclid` that does NOT have `utm_medium=paid_social` is treated as organic. Without consistent UTM tagging on ad URLs, paid and organic Facebook traffic will be misattributed.

The one exception is the `_fbc` cookie rescue: when a Facebook or Instagram referrer arrives with **no** `fbclid` in the URL but the Pixel's `_fbc` cookie was created within the last 30 minutes, the click's parameter was lost in transit (consent redirect, URL rewrite) and the visit is credited to `facebook_ads`. An `_fbc` sitting next to an `fbclid` proves nothing — the Pixel writes `_fbc` from whichever `fbclid` it sees, organic or paid — so that case stays organic.

For Google, Microsoft, and TikTok, the platform-specific click IDs (`gclid` / `gbraid` / `wbraid`, `msclkid`, `ttclid`) are unique to paid traffic and don't have this collision problem. UTMs are optional for those channels but recommended for GA4 reporting consistency; `utm_medium=cpc` on its own is also recognised as paid search.

---

## Google Ads Attribution

Google Ads detection works in three layers:

1. **`gclid`, `gbraid`, or `wbraid` in the URL** — present on the landing page when a user clicks a Google Ad. `gbraid` and `wbraid` are the iOS privacy-preserving equivalents of `gclid`; without them, iOS ad clicks fall through to organic or direct.
2. **`utm_medium=cpc`** — catches manually tagged ads when auto-tagging is off or a redirect stripped the click ID.
3. **Fresh `_gcl_aw` cookie** — set automatically by gtag.js / the Conversion Linker when auto-tagging is enabled. The cookie embeds its creation time (`GCL.{seconds}.{gclid}`), and only a cookie **created within the last 30 minutes** counts: it either upgrades a Google organic referrer to `google_ads` or rescues a direct arrival. A stale cookie is ignored — those cookies live ~90 days, and honouring one would relabel every returning visitor as `google_ads` for months, over their real email, Microsoft Ads, or organic source.

For the `_gcl_aw` fallback to work, the Google Ads account must have auto-tagging enabled and gtag.js or the Conversion Linker must be firing on the site.

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

SessionStorage is scoped to a single browser tab. If a user opens checkout in a new tab partway through a funnel, the new tab starts fresh and re-detects from the URL, referrer, and cookies at that moment.

For most flows this is fine — the new tab usually opens with the source URL intact, and a fresh `_gcl_aw` / `_fbc` cookie will still rescue a paid click. If cross-tab persistence is required (e.g. multi-tab purchase comparison flows), add a localStorage layer that writes alongside sessionStorage and reads as a fallback.

---

## Known Limitations

- **No cross-session attribution.** Closing the browser ends the session. A user who visits via Facebook Ads on Monday and converts via direct on Wednesday will be attributed to direct on Wednesday. This is intentional last-touch behavior; use MTK Attribution for first-touch and journey reporting.
- **iOS Safari ITP** restricts cookie and storage lifetimes on Apple devices. The `_fbc` and `_gcl_aw` cookies may have shortened lifespans, which can affect the cookie rescues specifically.
- **Untagged Meta ads look organic.** A paid Facebook click that arrives with `fbclid` but no `utm_medium=paid_social` returns `facebook_organic`. This is by design — see above.
- **Untagged landing pages with no referrer are direct.** If a user lands with no UTMs, no click ID, no referrer, and no fresh platform cookie, the visit is `direct`, and a later form submit on an internal page inherits that. UTM-tag your landing pages.
- **Referrer-based organic detection** relies on `document.referrer` on the entry pageview. If the landing page is reached via a redirect that strips the referrer, the visit resolves as `direct` unless a fresh platform cookie rescues it.
- **Unknown referrers are bucketed as `referral`**, not reported by hostname, to keep the value's cardinality low in Meta and GA4 reports.

---

## Usage in GTM

### Variable Setup

- **Variable type:** Custom JavaScript
- **Variable name:** cJS - Traffic Source
- **Return type:** String

Paste the contents of [`cjs-traffic-source.js`](cjs-traffic-source.js) as the variable body, or import the [GTM Essentials container](../gtm-essentials-variables/) which includes it.

### Tag Implementation — Lead Event

```javascript
<script>
fbq('track', 'Lead', {
  lead_type: 'Form Submit',
  content_name: '{{Page Path}}',
  traffic_source: '{{cJS - Traffic Source}}', // last-touch traffic source
  ad_placement: '{{cJS - Ad Placement}}'
}, {
  eventID: '{{cJS - Custom Event ID}}'
});
</script>
```

### Tag Implementation — GA4 Event Parameter

| Parameter | Value |
| --- | --- |
| `cjs_traffic_source` | `{{cJS - Traffic Source}}` |

Register `cjs_traffic_source` as a custom dimension in GA4 to report on it.
