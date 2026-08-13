# Meta Lead tag lives in two places — keep them in sync

The `fbq('track', 'Lead', …)` snippet exists in BOTH:

1. `meta/pixel/lead/chtml-lead-config.html`
2. the **Meta - Event - Lead - Form Submit** tag inside
   `gtm-essentials/gtm-starter-kit/gtm-starter-kit.json` (the `html` parameter,
   JSON-escaped)

These must always match. Whenever one is updated, apply the same change to the
other in the same commit — and update both folders' READMEs to match.
