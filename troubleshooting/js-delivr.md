# Troubleshooting

Issues common to all scripts hosted in this repo and loaded via jsDelivr.

## Script returns 404 or serves stale content

jsDelivr caches every file path it serves. When a script is moved, renamed, or updated, the old cached version (including 404 responses) can stick around for up to 12 hours before refreshing automatically.

**To force an immediate refresh, purge the jsDelivr cache for that URL.**

The purge URL is the exact same as the script URL, with `cdn.jsdelivr.net` replaced by `purge.jsdelivr.net`.

### Anatomy of the purge URL

Every purge URL has two parts:

- **Library root** — the same for every script in this repo:
  `https://purge.jsdelivr.net/gh/whboggs/code-library@main/`
- **Script path** — varies per script, matches the path inside the repo:
  `ghl/scripts/form-submit-bridge/form-submit-bridge.js`

Combined, that gives you:

```
https://purge.jsdelivr.net/gh/whboggs/code-library@main/ghl/scripts/form-submit-bridge/form-submit-bridge.js
```

To purge any other script in this library, just swap the script path for whichever file you're loading.

### How to purge

Visit the purge URL in any browser. You'll see a JSON response confirming the purge succeeded. Reload the client site — the latest version will be served.

### When to purge

- After moving or renaming a script in the repo
- After pushing an update and clients are still seeing old behavior
- When the URL returns 404 but you've verified the file exists in the repo

### How long do cached responses last?

| URL type | Default cache duration |
|---|---|
| `@main` (branch reference) | ~12 hours |
| `@v1` (major version) | ~24 hours |
| `@v1.0.0` (exact tag) | Effectively forever (immutable) |
| `@{commit-sha}` | Effectively forever (immutable) |

Branch references update automatically over time. Tagged versions don't — that's by design, so production deployments are stable.

## Script is loading but doesn't run

Check the browser console for errors. Common causes:

- The site has a Content Security Policy (CSP) blocking `cdn.jsdelivr.net`. Look for "Refused to load the script" errors in the console.
- The GTM Custom HTML tag has "Support document.write" checked when it shouldn't be (or vice versa, depending on the loader pattern used).
- The script loaded but its logic depends on something not yet on the page (e.g., the iframe it's listening to hasn't loaded yet).

## Still stuck?

Open an issue in this repo with:
- Which script you're loading
- The full script URL from your tag
- A screenshot of the browser Network tab showing the request status
- Any errors from the browser Console
