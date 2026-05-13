function() {
  // Last-touch traffic source for both lead gen and ecommerce conversions
  // Uses sessionStorage to persist source through multi-page funnels (checkout flows, popup forms on internal pages)
  // Distinguishes paid Facebook from organic via UTM convention since fbclid alone is unreliable
  
  var urlParams = new URLSearchParams(window.location.search);
  var referrer = document.referrer.toLowerCase();
  
  // Helper to safely read from sessionStorage with fallback for private browsing/blocked storage
  function getStored(key) {
    try { return sessionStorage.getItem(key) || ''; } catch(e) { return ''; }
  }
  
  // Helper to safely write to sessionStorage
  function setStored(key, value) {
    try { sessionStorage.setItem(key, value); } catch(e) {}
  }
  
  // STEP 1: Capture any fresh signals from current URL into sessionStorage
  // This ensures last-touch works correctly when a user re-enters the site with a new click ID
  
  // Click ID capture - each platform's unique click identifier
  if (urlParams.get('gclid')) setStored('gclid', urlParams.get('gclid'));
  if (urlParams.get('msclkid')) setStored('msclkid', urlParams.get('msclkid'));
  if (urlParams.get('fbclid')) setStored('fbclid', urlParams.get('fbclid'));
  if (urlParams.get('ttclid')) setStored('ttclid', urlParams.get('ttclid'));
  
  // UTM capture - source and medium together let us distinguish paid social from organic social
  if (urlParams.get('utm_source')) setStored('utm_source', urlParams.get('utm_source').toLowerCase());
  if (urlParams.get('utm_medium')) setStored('utm_medium', urlParams.get('utm_medium').toLowerCase());
  
  // Capture the original referrer on first pageview so organic detection works on deep funnel pages
  // Only set this once per session - if storage already has it, this is not the landing page
  if (!getStored('original_referrer') && referrer && referrer.indexOf(window.location.hostname) === -1) {
    setStored('original_referrer', referrer);
  }
  
  // STEP 2: Resolve traffic source using all available signals (URL + stored)
  
  var utmSource = urlParams.get('utm_source') ? urlParams.get('utm_source').toLowerCase() : getStored('utm_source');
  var utmMedium = urlParams.get('utm_medium') ? urlParams.get('utm_medium').toLowerCase() : getStored('utm_medium');
  
  // Paid social detection - requires explicit UTM tagging since fbclid alone catches organic posts too
  // Convention: utm_medium=paid_social with utm_source identifying the platform
  if (utmMedium === 'paid_social') {
    if (utmSource === 'facebook') return 'facebook_ads';
    if (utmSource === 'instagram') return 'instagram_ads';
    if (utmSource === 'linkedin') return 'linkedin_ads';
    if (utmSource === 'tiktok') return 'tiktok_ads';
    // Fallback for any other paid social platform we haven't bucketed
    return utmSource + '_ads';
  }
  
  // Google Ads - check URL gclid, then stored gclid, then _gcl_aw cookie set by gtag auto-tagging
  if (urlParams.get('gclid') || getStored('gclid')) return 'google_ads';
  if (document.cookie.indexOf('_gcl_aw=') > -1) return 'google_ads';
  
  // Microsoft Ads - msclkid is reliable on its own
  if (urlParams.get('msclkid') || getStored('msclkid')) return 'microsoft_ads';
  
  // TikTok Ads - ttclid is reliable on its own (TikTok organic posts don't append it)
  if (urlParams.get('ttclid') || getStored('ttclid')) return 'tiktok_ads';
  
  // Generic UTM source fallback - catches email, partnerships, custom campaigns
  // Combines source and medium for clarity (e.g. email_newsletter, partner_referral)
  if (utmSource) {
    return utmMedium ? utmSource + '_' + utmMedium : utmSource;
  }
  
  // Facebook organic - fbclid present without paid_social UTM means it came from an organic post
  if (urlParams.get('fbclid') || getStored('fbclid')) return 'facebook_organic';
  
  // STEP 3: Organic referrer detection - use original referrer from session storage if available
  // This makes organic attribution survive multi-page funnels where document.referrer becomes self-referential
  var sourceReferrer = getStored('original_referrer') || referrer;
  
  if (sourceReferrer.indexOf('google.') > -1) return 'google_organic';
  if (sourceReferrer.indexOf('bing.') > -1) return 'bing_organic';
  if (sourceReferrer.indexOf('yahoo.') > -1) return 'yahoo_organic';
  if (sourceReferrer.indexOf('duckduckgo.') > -1) return 'duckduckgo_organic';
  if (sourceReferrer.indexOf('facebook.') > -1 || sourceReferrer.indexOf('fb.') > -1) return 'facebook_organic';
  if (sourceReferrer.indexOf('instagram.') > -1) return 'instagram_organic';
  if (sourceReferrer.indexOf('linkedin.') > -1) return 'linkedin_organic';
  if (sourceReferrer.indexOf('twitter.') > -1 || sourceReferrer.indexOf('x.com') > -1) return 'twitter_organic';
  if (sourceReferrer.indexOf('youtube.') > -1) return 'youtube_organic';
  if (sourceReferrer.indexOf('reddit.') > -1) return 'reddit_organic';
  if (sourceReferrer.indexOf('pinterest.') > -1) return 'pinterest_organic';
  if (sourceReferrer.indexOf('tiktok.') > -1) return 'tiktok_organic';
  
  // No referrer at all = direct (typed URL, bookmark, app, dark social, email client)
  if (!sourceReferrer) return 'direct';
  
  // Same-domain referrer with no other signals = direct (internal navigation from unknown origin)
  if (sourceReferrer.indexOf(window.location.hostname) > -1) return 'direct';
  
  // External referring site we don't have a specific bucket for
  return 'referral';
}
