/*!
 * Marketing Toolkit — GTM Core Bootstrap v1.0.0
 * https://github.com/whboggs/marketing-toolkit
 *
 * Reads window.mtConfig and loads enabled tracking scripts from CDN.
 * Each script pushes its value silently to dataLayer for use via Data Layer Variables.
 *
 * Created by W.H. Boggs — https://whboggs.com
 * → Free Meta Ads audit: https://whboggs.com/audit
 *
 * MIT License | Copyright (c) 2026 W.H. Boggs
 */

(() => {
  // Base CDN URL pinned to major version v1 — auto-updates within 1.x but never 2.x
  const BASE_URL = 'https://cdn.jsdelivr.net/gh/whboggs/marketing-toolkit@v1/gtm/gtm-core/variables/';

  // Map of config keys (snake_case) to their CDN file paths
  // This is the source of truth for which scripts exist in this toolkit
  // Config keys are a public API — never rename them once shipped
  const SCRIPT_MAP = {
    ad_placement: 'ad-placement/ad-placement.js',
    traffic_source: 'traffic-source/traffic-source.js'
    // Add new scripts here as they ship
  };

  // Read user config or default to empty object (everything off)
  const config = window.mtConfig || {};

  // Track loaded and skipped scripts for the console summary
  const loaded = [];
  const skipped = [];

  // Levenshtein distance for "did you mean" typo suggestions
  // Small implementation — only used when config has unknown keys
  const distance = (a, b) => {
    const matrix = Array.from({ length: a.length + 1 }, () => []);
    for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }
    return matrix[a.length][b.length];
  };

  // Find the closest known key for a typo'd config key
  // Returns null if no key is reasonably close
  const suggest = (badKey) => {
    const validKeys = Object.keys(SCRIPT_MAP);
    let best = null;
    let bestDistance = Infinity;
    validKeys.forEach((key) => {
      const d = distance(badKey, key);
      if (d < bestDistance && d <= 3) {
        best = key;
        bestDistance = d;
      }
    });
    return best;
  };

  // Validate config keys — warn about unknowns with suggestions
  // Helps users catch typos like `trafic_source` instead of `traffic_source`
  Object.keys(config).forEach((key) => {
    if (!(key in SCRIPT_MAP)) {
      const suggestion = suggest(key);
      const message = suggestion
        ? `[mt] Unknown config key: "${key}". Did you mean "${suggestion}"?`
        : `[mt] Unknown config key: "${key}". No matching script found.`;

      console.warn(message);

      // Push warning to dataLayer so it's visible in GTM Preview mode
      // Marketers debug there more often than in DevTools console
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: 'mt_config_warning',
        mt_warning_type: 'unknown_key',
        mt_warning_key: key,
        mt_warning_suggestion: suggestion
      });
    }
  });

  // Loop through the script map and load each enabled script
  // Missing keys are treated as false — users must explicitly opt in
  // This protects against accidentally enabling new scripts in older installs
  Object.keys(SCRIPT_MAP).forEach((key) => {
    if (config[key] === true) {
      // User explicitly enabled this script
      const script = document.createElement('script');
      script.src = BASE_URL + SCRIPT_MAP[key];
      script.async = true;
      document.head.appendChild(script);
      loaded.push(key);
    } else {
      // Not enabled — either missing from config or set to false
      skipped.push(key);
    }
  });

  // Log a summary so users can verify what's loaded
  // Shows in DevTools console; helps debugging without needing GTM Preview
  console.info(
    '[mt] Marketing Toolkit — GTM Core Bootstrap v1.0.0',
    '\nLoaded:', loaded.length ? loaded.join(', ') : 'none',
    '\nSkipped:', skipped.length ? skipped.join(', ') : 'none'
  );
})();
