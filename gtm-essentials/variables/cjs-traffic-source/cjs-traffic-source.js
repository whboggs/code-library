/*!
 * Marketing Toolkit — cJS – Traffic Source
 * Version: v2.0.0
 * Last updated: 2026-09-02
 * https://github.com/whboggs/marketing-toolkit
 */

function() {
  // cJS - Traffic Source
  //
  // Last-touch traffic source for lead gen and ecommerce conversion tags, returned as one
  // flat snake_case string (google_ads, facebook_ads, google_organic, newsletter_email,
  // referral, direct, ...).
  //
  // Classification mirrors the MTK Attribution engine (resolveTouch): the same click IDs,
  // the same utm_medium values, the same referrer domain lists, and the same fresh-cookie
  // rescue — collapsed to a single string instead of channel + source.
  //
  // An ENTRY is resolved once, from the pageview that brought the visitor in, and carried
  // through the tab in sessionStorage so popup forms and multi-step checkouts on internal
  // pages still report the source that started the visit. A later pageview only replaces
  // the stored entry when it carries a fresh campaign signal in the URL (a click ID or a
  // UTM) or the tab has been idle for longer than the session window — internal navigation
  // never changes attribution, and neither does a mid-funnel bounce through a payment
  // gateway or an OAuth provider.

  var STORE_KEY = 'cjs_traffic_source';         // sessionStorage key: {"v": "<source>", "t": <last activity ms>}
  var SESSION_TIMEOUT = 30 * 60 * 1000;         // 30 minutes, GA-style — idle longer than this = new entry
  var PAID_SOCIAL_MEDIUM = 'paid_social';       // the utm_medium ad URLs must carry to count as paid social

  // Referrer domain lists — same fragments as the MTK engine defaults. A trailing dot means
  // "this label anywhere in the host" (google.com, news.google.de); an inner dot means "this
  // exact domain or a subdomain of it" (x.com, www.x.com — but never wix.com).
  var SEARCH_DOMAINS = ['google.', 'bing.', 'yahoo.', 'duckduckgo.', 'ecosia.'];
  var SOCIAL_DOMAINS = ['facebook.', 'fb.', 'instagram.', 'linkedin.', 'twitter.', 'x.com', 'youtube.', 'reddit.', 'pinterest.', 'tiktok.', 't.co'];

  // utm_source aliases -> the platform name this variable reports. Covers Meta's
  // {{site_source_name}} values (fb / ig / msg / an) recommended in the UTM docs, so a paid
  // Facebook click tagged utm_source=fb returns facebook_ads, not fb_ads.
  var SOURCE_ALIASES = {
    fb: 'facebook', ig: 'instagram', msg: 'messenger', an: 'audience_network',
    x: 'twitter', 'x.com': 'twitter',
    googleads: 'google', adwords: 'google',
    bingads: 'microsoft', bing: 'microsoft'
  };

  // ---------------------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------------------

  var params = new URLSearchParams(window.location.search);
  function param(key) { return params.get(key) || ''; }
  function lower(s) { return s ? String(s).toLowerCase() : ''; }

  // Turn any typed value into a safe snake_case token ("Facebook Ads" -> "facebook_ads").
  function slug(s) {
    return lower(s).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  }

  // Alias lookup, then slug — so utm_source=IG and utm_source=Instagram both give "instagram".
  function sourceName(raw) {
    var key = lower(raw);
    if (!key) return '';
    return SOURCE_ALIASES.hasOwnProperty(key) ? SOURCE_ALIASES[key] : slug(key);
  }

  // sessionStorage access that degrades to "no persistence" in private browsing / blocked storage.
  function readStore() {
    try { var raw = sessionStorage.getItem(STORE_KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }
  function writeStore(value) {
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify({ v: value, t: Date.now() })); } catch (e) {}
  }

  // Referrer HOST only — scheme, userinfo, port, and path stripped — so a path or query string
  // containing "x.com" or "google." can never be mistaken for the referring domain.
  var referrer = lower(document.referrer);
  var refHost = referrer
    .replace(/^[a-z][a-z0-9+.-]*:\/\//, '')
    .split('/')[0]
    .split('@').pop()
    .split(':')[0];
  var selfHost = lower(window.location.hostname);

  // A referrer from the site's own hostname is internal navigation, not attribution.
  var hasReferrer = referrer !== '' && refHost !== selfHost;

  // Boundary-aware domain match against refHost (see SEARCH_DOMAINS comment for the styles).
  function hostMatches(frag) {
    if (!frag) return false;
    if (frag.charAt(frag.length - 1) === '.') {
      // "google." — label prefix anywhere in the host
      return refHost.indexOf(frag) === 0 || refHost.indexOf('.' + frag) > -1;
    }
    if (frag.indexOf('.') > -1) {
      // "x.com" — exact registrable domain or a subdomain of it
      if (refHost === frag) return true;
      var tail = '.' + frag;
      return refHost.length > tail.length && refHost.indexOf(tail) === refHost.length - tail.length;
    }
    return refHost.indexOf(frag) > -1;             // plain substring for loose custom entries
  }
  function matchesList(list) {
    for (var i = 0; i < list.length; i++) { if (hostMatches(list[i])) return true; }
    return false;
  }

  // The platform name behind a referrer, used for the "<name>_organic" buckets. Anything not
  // listed reports its registrable-ish host label (e.g. "ecosia" for ecosia.org).
  function referrerName() {
    if (hostMatches('google.')) return 'google';
    if (hostMatches('bing.')) return 'bing';
    if (hostMatches('yahoo.')) return 'yahoo';
    if (hostMatches('duckduckgo.')) return 'duckduckgo';
    if (hostMatches('facebook.') || hostMatches('fb.')) return 'facebook';
    if (hostMatches('instagram.')) return 'instagram';
    if (hostMatches('linkedin.')) return 'linkedin';
    if (hostMatches('twitter.') || hostMatches('x.com') || hostMatches('t.co')) return 'twitter';
    if (hostMatches('youtube.')) return 'youtube';
    if (hostMatches('reddit.')) return 'reddit';
    if (hostMatches('pinterest.')) return 'pinterest';
    if (hostMatches('tiktok.')) return 'tiktok';
    var labels = refHost.replace(/^www\./, '').split('.');
    return slug(labels.length > 1 ? labels[labels.length - 2] : labels[0]);
  }

  // Cookie reader — exact name match, so "_gcl_aw" can't be satisfied by "x_gcl_aw".
  function readCookie(name) {
    var parts = document.cookie ? document.cookie.split('; ') : [];
    for (var i = 0; i < parts.length; i++) {
      var pair = parts[i].split('=');
      if (pair[0] === name) {
        try { return decodeURIComponent(pair.slice(1).join('=')); } catch (e) { return ''; }
      }
    }
    return '';
  }

  // Platform cookies embed the click ID AND its creation time. Only a FRESH cookie — created
  // within the session window — may classify an entry. A stale one just means "returning
  // visitor" (these cookies live ~90 days); using it would erase Direct and double-credit ads
  // for months. Returns the click ID, or null.
  function freshClickCookie(name, tsIndex, tsUnit) {
    var raw = readCookie(name);
    if (!raw) return null;
    var parts = raw.split('.');
    var ts = parseInt(parts[tsIndex], 10);
    if (!ts) return null;
    if (tsUnit === 's') ts = ts * 1000;
    var age = Date.now() - ts;
    if (age < 0 || age > SESSION_TIMEOUT) return null;
    return parts.slice(tsIndex + 1).join('.') || null;
  }
  function freshGclid()  { return freshClickCookie('_gcl_aw', 1, 's'); }   // "_gcl_aw" = GCL.{seconds}.{gclid}
  function freshFbclid() { return freshClickCookie('_fbc', 2, 'ms'); }     // "_fbc"    = fb.1.{ms}.{fbclid}

  // Does THIS pageview carry a campaign signal — any UTM or any ad-platform click ID? Read from
  // the URL only: cookies outlive the click by weeks and must never look like a fresh arrival.
  function hasCampaignSignal() {
    if (param('utm_source') || param('utm_medium') || param('utm_campaign')) return true;
    return !!(param('gclid') || param('gbraid') || param('wbraid') ||
              param('msclkid') || param('fbclid') || param('ttclid'));
  }

  // ---------------------------------------------------------------------------------------
  // Resolver — the MTK engine's rule order, flattened to one string. First match wins.
  // ---------------------------------------------------------------------------------------
  function resolve() {
    var utmSourceRaw = param('utm_source');
    var utmSource = lower(utmSourceRaw);
    var utmMedium = lower(param('utm_medium'));

    var gclid   = param('gclid');
    var gbraid  = param('gbraid');                   // iOS web-to-app Google Ads click ID
    var wbraid  = param('wbraid');                   // iOS app-to-web Google Ads click ID
    var msclkid = param('msclkid');
    var fbclid  = param('fbclid');
    var ttclid  = param('ttclid');

    // 1. Paid Search — any Google / Microsoft click ID, or utm_medium=cpc / paid_search
    //    (manual tagging with auto-tagging off, or a click ID stripped by a redirect).
    if (gclid || gbraid || wbraid || msclkid || utmMedium === 'cpc' || utmMedium === 'paid_search') {
      if (msclkid || utmSource === 'bing' || utmSource === 'bingads' || utmSource === 'microsoft') return 'microsoft_ads';
      if (!utmSource || utmSource === 'google' || utmSource === 'googleads' || utmSource === 'adwords') return 'google_ads';
      return sourceName(utmSourceRaw) + '_ads';    // some other paid-search network, tagged by hand
    }

    // 2. Paid Social — REQUIRES the utm_medium convention. Meta appends fbclid to organic posts
    //    too, so fbclid / _fbc alone can never prove a paid click.
    if (utmMedium === PAID_SOCIAL_MEDIUM) {
      return (sourceName(utmSourceRaw) || 'facebook') + '_ads';
    }

    // 3. TikTok Ads — ttclid is paid-only (organic TikTok links don't carry it).
    if (ttclid) return 'tiktok_ads';

    // 4. Email — "<source>_email" (newsletter_email, klaviyo_email), or plain "email" when untagged.
    if (utmMedium === 'email') {
      return utmSource ? sourceName(utmSourceRaw) + '_email' : 'email';
    }

    // 5. Any other tagged campaign — "<source>_<medium>" (partner_referral, podcast_sponsorship),
    //    or just "<source>" when there is no medium.
    if (utmSource) {
      return utmMedium ? sourceName(utmSourceRaw) + '_' + slug(utmMedium) : sourceName(utmSourceRaw);
    }

    // 6. Untagged arrival with an external referrer.
    if (hasReferrer) {
      if (matchesList(SEARCH_DOMAINS)) {
        // Same-platform upgrade: an ad click FROM google.com whose gclid was lost in transit
        // still set a fresh _gcl_aw — that's Google Ads, not organic.
        if (hostMatches('google.') && freshGclid()) return 'google_ads';
        return referrerName() + '_organic';
      }
      if (matchesList(SOCIAL_DOMAINS) || fbclid) {
        // Same-platform upgrade — but ONLY when the URL carried no fbclid. The Pixel writes _fbc
        // from whichever fbclid it sees, so a fresh _fbc next to an fbclid is just that (possibly
        // organic) click echoed back. With no fbclid in the URL, a fresh _fbc is real evidence of
        // a paid click whose parameter went missing.
        if (!fbclid && (hostMatches('facebook.') || hostMatches('fb.') || hostMatches('instagram.')) && freshFbclid()) {
          return 'facebook_ads';
        }
        // fbclid from a referrer outside the social list (e.g. a Messenger in-app browser) is still Meta.
        return (matchesList(SOCIAL_DOMAINS) ? referrerName() : 'facebook') + '_organic';
      }
      return 'referral';                           // some other site we don't bucket
    }

    // 7. fbclid with no referrer at all (some in-app browsers strip it) — still an organic Meta click.
    if (fbclid) return 'facebook_organic';

    // 8. Cookie rescue — last resort before Direct. A FRESH platform cookie means an ad click just
    //    happened but its URL signal never reached us (consent redirect, URL rewrite, tag first
    //    firing mid-session). Stale cookies never classify.
    if (freshGclid()) return 'google_ads';
    if (freshFbclid()) return 'facebook_ads';

    // 9. Nothing identifying — typed URL, bookmark, app, dark social.
    return 'direct';
  }

  // ---------------------------------------------------------------------------------------
  // Entry handling — reuse the stored entry through internal navigation; re-resolve on a fresh
  // campaign signal, after the idle window, or when nothing is stored yet.
  // ---------------------------------------------------------------------------------------
  var stored = readStore();
  var expired = !stored || !stored.t || (Date.now() - stored.t) > SESSION_TIMEOUT;

  if (stored && stored.v && !expired && !hasCampaignSignal()) {
    writeStore(stored.v);                          // touch last-activity, keep the value
    return stored.v;
  }

  var value = resolve();
  writeStore(value);
  return value;
}
