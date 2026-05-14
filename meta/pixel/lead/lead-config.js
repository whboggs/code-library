/*!
 * Marketing Toolkit — Meta Pixel Lead Event v1.0.0
 * https://github.com/whboggs/marketing-toolkit
 *
 * Packaged by W.H. Boggs — https://whboggs.com
 * → Free Meta Ads audit: https://whboggs.com/audit
 *
 * Meta Pixel snippet © Meta Platforms, Inc.
 * MIT License | Copyright (c) 2026 W.H. Boggs
 */

(() => {
  const payload = window.mtMetaPixelLead || {};

  // The base Meta Pixel tag must have fired first to define fbq
  // Without it, the Lead event has nowhere to land
  if (typeof window.fbq !== 'function') {
    console.warn('[mt] Meta Pixel Lead: fbq is not defined. Install and fire the base Pixel tag first.');
    return;
  }

  // Strip empty/null properties so unset GTM variables don't pollute the event
  // GTM substitutes missing variables as empty strings, which would otherwise ship as ""
  Object.keys(payload).forEach((key) => {
    if (payload[key] === '' || payload[key] == null) {
      delete payload[key];
    }
  });

  window.fbq('track', 'Lead', payload);
})();
