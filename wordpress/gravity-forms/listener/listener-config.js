/*!
 * Marketing Toolkit — Gravity Forms GTM Listener v1.1.0
 * https://github.com/whboggs/marketing-toolkit
 *
 * Packaged by W.H. Boggs — https://whboggs.com
 * → Free Meta Ads audit: https://whboggs.com/audit
 *
 * MIT License | Copyright (c) 2026 W.H. Boggs
 */

(() => {
  window.dataLayer = window.dataLayer || [];

  // Legacy jQuery path (pre-2.9) and GF 2.9+ native path can both fire for the
  // same submission on sites running the back-compat shim — suppress duplicates.
  const recent = new Map();
  const DEDUPE_MS = 1000;

  function pushOnce(event, formId, currentPage) {
    if (formId == null) return;
    const key = `${event}:${formId}:${currentPage == null ? '' : currentPage}`;
    const now = Date.now();
    const last = recent.get(key);
    if (last && now - last < DEDUPE_MS) return;
    recent.set(key, now);
    const payload = { event, gforms_form_id: formId };
    if (currentPage != null) payload.gforms_current_page = currentPage;
    window.dataLayer.push(payload);
  }

  // ── GF 2.9+ native CustomEvent: multi-page navigation in new AJAX path ────
  // https://docs.gravityforms.com/gform-ajax-post_page_change/
  document.addEventListener('gform/ajax/post_page_change', function (e) {
    const d = e.detail || {};
    pushOnce('gforms_page_loaded', d.formId, d.pageNumber);
  });

  // ── GF 2.9+ filter API: AJAX submission completion ────────────────────────
  // Registered through gform.utils.addFilter, not addEventListener. The filter
  // also runs for validation failures, so only push when a confirmation is
  // actually being displayed.
  // https://docs.gravityforms.com/gform-ajax-post_ajax_submission/
  function bindNative() {
    const utils = window.gform && window.gform.utils;
    if (!utils || typeof utils.addFilter !== 'function') return false;
    utils.addFilter('gform/ajax/post_ajax_submission', function (data) {
      const formId = data && data.form && data.form.id;
      const result = data && data.submissionResult;
      if (result && (result.confirmation_message || result.confirmation_redirect)) {
        pushOnce('gforms_form_success', formId);
      }
      return data;
    });
    return true;
  }

  // ── Legacy jQuery events (pre-2.9; still fire on 2.9 with compat shim) ────
  // https://docs.gravityforms.com/gform_confirmation_loaded/
  // https://docs.gravityforms.com/gform_page_loaded/
  function bindJQuery() {
    const $ = window.jQuery;
    if (!$) return false;
    $(document).on('gform_confirmation_loaded', function (event, formId) {
      pushOnce('gforms_form_success', formId);
    });
    $(document).on('gform_page_loaded', function (event, formId, currentPage) {
      pushOnce('gforms_page_loaded', formId, currentPage);
    });
    return true;
  }

  // jQuery / gform.utils may load after this script — poll briefly for each.
  // Native addEventListener bindings above don't need polling; they queue
  // immediately and fire when GF dispatches the event.
  let attempts = 0;
  const maxAttempts = 50; // ~5s at 100ms intervals
  let jqBound = false;
  let nativeBound = false;
  (function tryBind() {
    if (!jqBound) jqBound = bindJQuery();
    if (!nativeBound) nativeBound = bindNative();
    if (jqBound && nativeBound) return;
    if (++attempts >= maxAttempts) return;
    setTimeout(tryBind, 100);
  })();
})();
