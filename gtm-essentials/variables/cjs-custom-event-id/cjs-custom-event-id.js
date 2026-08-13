/*
 * cJS - Custom Event ID
 * Globally unique event ID for Meta browser/CAPI deduplication.
 * Requires a Data Layer Variable named "DLV - gtm.uniqueEventId" reading
 * the built-in dataLayer key gtm.uniqueEventId.
 */

function() {
  var id = {{DLV - gtm.uniqueEventId}}; // Page-local counter — the cache key

  if (window.customEventIdKey !== id) {
    window.customEventIdKey = id;
    // Globally unique value — this is what actually goes to Meta
    window.customEventId = (new Date()).getTime() + '.' +
      Math.random().toString(36).substring(2, 10);
  }

  return window.customEventId;
}
