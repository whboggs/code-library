# Meta Pixel — Base

Loads Meta Pixel and fires the initial PageView event. Distributed via CDN so updates push automatically.

## What it does

1. Loads `fbevents.js` from Meta
2. Initializes the Pixel with your Pixel ID
3. Fires a single `PageView` event on page load

This is the foundational Meta Pixel install. Conversion events (Lead, Purchase, etc.) are handled by separate scripts.

## Installation

### Step 1: Create a GTM Constant Variable for your Pixel ID

In GTM, go to **Variables** → **User-Defined Variables** → **New**:

- **Variable Type:** Constant
- **Value:** Your Meta Pixel ID (e.g., `123456789012345`)
- **Name:** `Meta Pixel ID`

The name must match exactly — the install snippet references `{{Meta Pixel ID}}`.

### Step 2: Create the Custom HTML tag

In GTM, go to **Tags** → **New**:

1. Click **Tag Configuration** → choose **Custom HTML**
2. Paste the contents of `pixel-config.html` into the HTML field
3. Click **Triggering** → choose **All Pages — Page View**
4. Name the tag: `cHTML - Meta Pixel Base`
5. Save

### Step 3: Preview and publish

1. Click **Preview** to test in Tag Assistant
2. Visit your site — verify the Pixel fires by:
   - Checking the Network tab in DevTools for a request to `facebook.com/tr`
   - Using the Meta Pixel Helper Chrome extension
3. Once verified, publish your container

## How updates work

The Pixel logic is hosted on jsDelivr and pinned to the v1 release line. Updates push automatically — no action required from you.

## Configuration

Currently the only config option is `pixel_id`, set via the GTM Constant Variable. Future versions may add options like consent mode handling and automatic event enrichment from other toolkit variables.

## Known limitations

- No `<noscript>` fallback (modern browsers only)
- No double-install detection — if you already have Meta Pixel firing from another tag, you'll fire duplicate PageView events
- No built-in consent mode integration (handle separately in your CMP)

## Disclaimer

This script packages Meta's standard Pixel snippet for distribution via the Marketing Toolkit. The underlying Pixel code is provided by Meta Platforms, Inc. and subject to their terms.

Provided as-is under the MIT License. Test thoroughly before relying on it for revenue attribution.

---

**Packaged by W.H. Boggs** — [whboggs.com](https://whboggs.com)
[→ Free Meta Ads audit](https://whboggs.com/audit)
