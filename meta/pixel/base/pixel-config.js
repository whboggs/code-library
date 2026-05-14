/*!
 * Marketing Toolkit — Meta Pixel Base v1.1.0
 * https://github.com/whboggs/marketing-toolkit
 *
 * Packaged by W.H. Boggs — https://whboggs.com
 * → Free Meta Ads audit: https://whboggs.com/audit
 *
 * Meta Pixel snippet © Meta Platforms, Inc.
 * MIT License | Copyright (c) 2026 W.H. Boggs
 */

(() => {
  // Read configuration set by the GTM cHTML loader
  const config = window.mtMetaPixel || {};

  // Bail early if no Pixel ID was provided
  // Without an ID, fbq('init') would fail silently and waste a network request
  if (!config.pixel_id) {
    console.warn('[mt] Meta Pixel: missing pixel_id in window.mtMetaPixel');
    return;
  }

  // Standard Meta Pixel base snippet (unchanged from Meta's official version)
  // Loads fbevents.js and exposes the fbq() global function
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');

  // Initialize Pixel with the ID from config and fire the initial PageView
  window.fbq('init', config.pixel_id);
  window.fbq('track', 'PageView');
})();
