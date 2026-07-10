# Meta Pixel — Lead Event

Fires a Meta Pixel `Lead` event with custom parameters sourced from GTM variables. Distributed via CDN so updates push automatically.

## What it does

1. Reads payload values from GTM variables (traffic source, page path, optional form name)
2. Strips empty/missing values so unset variables don't pollute the event
3. Calls `fbq('track', 'Lead', payload)`

## Prerequisites

- The **base Meta Pixel** tag (`meta/pixel/base/`) must be installed and firing on All Pages — Page View. Without it, `fbq` is undefined and this tag warns and exits.
- A GTM variable named `cJS - Traffic Source` returning last-touch traffic source (Custom JavaScript variable).
- A GTM variable named `cJS - Ad Placement` returning the ad placement (Custom JavaScript variable).
- Built-in GTM variable `Page Path` enabled.
- *(Optional)* A Lookup Table variable named `LUT - Convert Form ID to Text` mapping form IDs to human-readable form names — uncomment the line in `lead-config.html` to send it.

## Installation

### Step 1: Create the Custom HTML tag

In GTM, go to **Tags** → **New**:

1. Click **Tag Configuration** → choose **Custom HTML**
2. Paste the contents of `lead-config.html` into the HTML field
3. *(Optional)* Uncomment the `form_name` line if you have the `LUT - Convert Form ID to Text` variable set up
4. Click **Triggering** → choose your form-success trigger (e.g., `Custom Event - GF Form Success` from the Gravity Forms listener, or any other trigger that signals a lead)
5. Name the tag: `cHTML - Meta Pixel Lead`
6. Save

### Step 2: Preview and publish

1. Click **Preview** to test in Tag Assistant
2. Submit a form on your site — verify the Lead event fires by:
   - Checking the Network tab in DevTools for a request to `facebook.com/tr` with `ev=Lead`
   - Using the Meta Pixel Helper Chrome extension (should show a `Lead` event with your custom parameters)
3. Once verified, publish your container

## Payload structure

The event is sent with the following parameters:

| Parameter | Source | Notes |
|---|---|---|
| `lead_type` | Hardcoded `Form Submit` | Custom param — change in `lead-config.html` if this tag fires for a different lead type (e.g., `Phone Call`) |
| `traffic_source` | `{{cJS - Traffic Source}}` | Custom param — last-touch traffic source |
| `content_name` | `{{Page Path}}` | Meta standard param — page where the lead occurred |
| `ad_placement` | `{{cJS - Ad Placement}}` | Custom param — ad placement |
| `form_name` | `{{LUT - Convert Form ID to Text}}` | *(Optional)* Custom param — human-readable form name |

Empty values are stripped before sending.

## How updates work

The event logic is hosted on jsDelivr and currently pulled from `@main` for testing. Once a `v1.x.x` git tag is published, switch the `src` in `lead-config.html` from `@main` to `@v1` for cache-stable releases.

## Known limitations

- **One lead type per tag**: `lead_type` is hardcoded in the cHTML loader. Duplicate the tag for different lead types (Phone Call, Demo Request, etc.) and edit the value.
- **No event deduplication**: If both the browser pixel and a server-side CAPI integration send Lead events, you'll need to add an `event_id` to dedupe. Not handled here.
- **No consent mode integration**: Handle in your CMP separately.

## Disclaimer

This script packages Meta's standard Pixel snippet for distribution via the Marketing Toolkit. The underlying Pixel code is provided by Meta Platforms, Inc. and subject to their terms.

Provided as-is under the MIT License. Test thoroughly before relying on it for revenue attribution.

---

**Packaged by W.H. Boggs** — [whboggs.com](https://whboggs.com)
[→ Free Meta Ads audit](https://whboggs.com/audit)
