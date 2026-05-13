/*!
 * Marketing Toolkit — Ad Placement v1.0.0
 * https://github.com/whboggs/marketing-toolkit
 *
 * Captures utm_placement from URL on first pageview, persists via sessionStorage.
 * Pushes value to dataLayer silently (no event) for use via Data Layer Variables.
 *
 * DataLayer key: ad_placement
 * Storage key: mt_ad_placement
 *
 * Created by W.H. Boggs — https://whboggs.com
 * → Free Meta Ads audit: https://whboggs.com/audit
 *
 * MIT License | Copyright (c) 2026 W.H. Boggs
 */

(() => {
  // Storage key uses mt_ prefix to avoid collision with other tools' sessionStorage
  const STORAGE_KEY = 'mt_ad_placement';

  // Helper: safely read from sessionStorage with fallback for private browsing
  // Private mode and some security configurations block sessionStorage entirely
  const getStored = () => {
    try {
      return sessionStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
  };

  // Helper: safely write to sessionStorage, fail silently if blocked
  const setStored = (value) => {
    try {
      sessionStorage.setItem(STORAGE_KEY, value);
    } catch (e) {
      // Silent fail — script still works for single-pageview attribution
    }
  };

  // Resolve the placement value using URL first, sessionStorage fallback
  // Returns null if neither source has a value (caller decides what to do)
  const resolvePlacement = () => {
    try {
      // Check current URL for utm_placement (freshest signal)
      const urlParams = new URLSearchParams(window.location.search);
      const placementFromUrl = urlParams.get('utm_placement');

      if (placementFromUrl) {
        // Fresh value — store it and return
        setStored(placementFromUrl);
        return placementFromUrl;
      }

      // No URL value — fall back to sessionStorage from earlier in this session
      const stored = getStored();
      if (stored) return stored;

      // No value available from either source
      return null;
    } catch (e) {
      // URLSearchParams unavailable (very old browsers) or other failure
      return null;
    }
  };

  // Get the placement value
  const placement = resolvePlacement();

  // Only push when a placement value exists — keeps dataLayer clean
  // Missing keys in dataLayer are handled gracefully by DLV default values
  if (placement) {
    // Ensure dataLayer exists before pushing (GTM creates it but be safe)
    window.dataLayer = window.dataLayer || [];

    // Silent push — no event key, so this doesn't trigger anything
    // The value becomes available to any DLV reading "ad_placement"
    window.dataLayer.push({
      ad_placement: placement
    });
  }
})();
