/*!
 * Marketing Toolkit — Gravity Forms GTM Listener v1.3.0
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

  // ── Field completion: blur on a GF input with a non-empty value ──────────
  // Uses focusout (bubbles) for delegation. Values are NOT pushed — they may
  // contain PII (emails, names, phone). Dedupe per field on value so re-
  // tabbing the same field without editing it doesn't push twice.
  const lastFieldValue = new Map();
  const SKIP_TYPES = new Set(['hidden', 'submit', 'button', 'reset', 'file', 'image']);
  document.addEventListener('focusout', function (e) {
    const target = e.target;
    if (!target || !target.tagName || !target.closest) return;
    const tag = target.tagName.toLowerCase();
    if (tag !== 'input' && tag !== 'select' && tag !== 'textarea') return;
    if (SKIP_TYPES.has((target.type || '').toLowerCase())) return;
    if (!target.closest('.gform_wrapper')) return;
    const value = (target.value || '').trim();
    if (!value) return;

    // GF wraps each field in <.gfield id="field_{formId}_{fieldId}">
    let formId = null;
    let fieldId = null;
    const fieldEl = target.closest('.gfield');
    if (fieldEl && fieldEl.id) {
      const m = fieldEl.id.match(/^field_(\d+)_(\d+)$/);
      if (m) { formId = m[1]; fieldId = m[2]; }
    }
    if (!formId) {
      const form = target.closest('form');
      formId = form && form.getAttribute('data-formid');
    }
    if (!formId || !fieldId) return;

    const key = formId + ':' + fieldId;
    if (lastFieldValue.get(key) === value) return;
    lastFieldValue.set(key, value);

    window.dataLayer.push({
      event: 'gforms_field_complete',
      gforms_form_id: formId,
      gforms_field_id: fieldId
    });
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

  // ── Form submit: capture user-defined hidden fields (fbc, gclid, utm_*) ──
  // Fires on the DOM submit event (capture phase) so values are available
  // before any navigation. GF's own internal hiddens (gform_submit, state_*,
  // _wp_http_referer, etc.) are skipped — only inputs named input_* (the
  // pattern GF assigns to user fields) are captured.
  document.addEventListener('submit', function (e) {
    const form = e.target;
    if (!form || !form.closest || !form.closest('.gform_wrapper')) return;
    const formId = form.getAttribute('data-formid')
      || (form.id && form.id.replace(/^gform_/, ''));
    if (!formId) return;
    const fields = {};
    form.querySelectorAll('input[type="hidden"][name^="input_"]').forEach(function (inp) {
      fields[inp.name] = inp.value;
    });
    window.dataLayer.push({
      event: 'gforms_form_submit',
      gforms_form_id: String(formId),
      gforms_fields: fields
    });
  }, true);

  // ── Non-AJAX confirmation: detect the confirmation message on page load ──
  // GF reloads the page with the form replaced by
  // <div id="gform_confirmation_message_{formId}">...</div>. AJAX paths still
  // push success via the filter / jQuery handlers above; pushOnce dedupes if
  // both fire.
  function checkConfirmation() {
    const els = document.querySelectorAll('[id^="gform_confirmation_message_"]');
    els.forEach(function (el) {
      const m = el.id.match(/^gform_confirmation_message_(\d+)$/);
      if (m) pushOnce('gforms_form_success', m[1]);
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkConfirmation, { once: true });
  } else {
    checkConfirmation();
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
