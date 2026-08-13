# Custom Event ID

Generates a globally unique event ID per GTM event — the value you pass to
Meta as `eventID` so the Pixel and the Conversions API deduplicate into a
single event.

## What it does

GTM's built-in `gtm.uniqueEventId` dataLayer key is only a **page-local
counter** (1, 2, 3, …) — it repeats on every page load, so it can't be sent to
Meta as-is. This variable uses that counter as a **cache key** and mints a
globally unique value behind it:

1. Reads `{{DLV - gtm.uniqueEventId}}` for the current event.
2. If the counter changed since the last call (i.e. this is a new event),
   generates a fresh ID: epoch milliseconds + `.` + an 8-character random
   string (e.g. `1754870400000.k3j9x2qa`).
3. Returns the cached ID for every variable reference within the **same**
   event — so a browser Pixel tag and a CAPI payload fired by the same event
   get the **same** ID, while distinct events always get distinct IDs.

## Required companion variable

This script references a Data Layer Variable that must exist in the container:

- **Type:** Data Layer Variable
- **Name:** `DLV - gtm.uniqueEventId`
- **Data Layer Variable Name:** `gtm.uniqueEventId`

Both variables are included in the
[`gtm-essentials-variables.json`](../gtm-essentials-variables/) import and the
[GTM Starter Kit](../../gtm-starter-kit/), so you only build them by hand if
you're adding this variable individually.

## Using the value

### In a Meta Pixel event tag (Custom HTML)

```javascript
fbq('track', 'Lead', { ... }, { eventID: '{{cJS - Custom Event ID}}' });
```

### In a Meta Conversions API payload

Send the same value as `event_id`. Because the value is cached per
`gtm.uniqueEventId`, both sides of the same event resolve to an identical ID
and Meta deduplicates them.

## Known limitations

- The cache lives on `window`, so it resets on every page load — that's fine,
  because the timestamp + random suffix keeps IDs unique across page loads.
- If the browser tag and the server payload are produced by **different** GTM
  events, their IDs won't match — fire both from the same trigger/event.

## Disclaimer

This script is provided as-is under the MIT License. Test thoroughly in your
own setup before relying on it for revenue attribution.

---

**Created by W.H. Boggs** — [whboggs.com](https://whboggs.com)
[→ Free Meta Ads audit](https://whboggs.com/audit)
