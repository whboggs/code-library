/*!
 * Wix Form Submission Listener (Velo)
 * Loaded from https://github.com/whboggs/marketing-toolkit
 *
 * Captures Wix Forms submissions in Velo page/site code and forwards a
 * normalized payload to GTM's dataLayer for GTM / Meta CAPI tracking.
 *
 * Velo frontend code cannot reliably reach window.dataLayer (it runs
 * sandboxed and dataLayer is frequently undefined there), so the push
 * itself is handled by the companion Custom Element in datalayer-bridge.js,
 * which runs in the real page window. This file only listens + normalizes.
 *
 * Created by whboggs — https://whboggs.com — Get in touch for a free tracking audit.
 *
 * MIT License — Copyright (c) 2026 W.H. Boggs
 * https://github.com/whboggs/marketing-toolkit/blob/main/LICENSE
 *
 * WHERE TO PASTE
 *   - One page only:  that page's code panel (Velo "Page Code").
 *   - Every page:     masterPage.js (Velo "Site Code / Public & Backend > masterPage.js").
 */

// ---------------------------------------------------------------------------
// CONFIG — edit these to match your site
// ---------------------------------------------------------------------------

// Element IDs of the Wix Form(s) to listen to. In the Editor, click a form
// and read its ID from the top-left of the Properties & Events panel.
var FORM_SELECTORS = ['#wixForms1'];

// Element ID of the Custom Element added from datalayer-bridge.js.
var BRIDGE_SELECTOR = '#dataLayerBridge';

// The dataLayer event name your GTM Custom Event trigger listens for.
var DATALAYER_EVENT = 'wix_form_submit';

// ---------------------------------------------------------------------------
// Listener
// ---------------------------------------------------------------------------

$w.onReady(function () {
  FORM_SELECTORS.forEach(function (selector) {
    var form;
    try {
      form = $w(selector);
    } catch (err) {
      // Selector isn't on this page — skip it silently.
      return;
    }
    if (!form || typeof form.onWixFormSubmitted !== 'function') return;

    // onWixFormSubmitted fires only after the server accepts the submission,
    // so we never push a dataLayer event for a failed / invalid submit.
    form.onWixFormSubmitted(function (event) {
      var payload = buildPayload(selector, (event && event.fields) || []);
      forwardToDataLayer(payload);
    });
  });
});

// ---------------------------------------------------------------------------
// Normalization — mirrors the GHL bridge so downstream GTM tags stay uniform
// ---------------------------------------------------------------------------

function buildPayload(formSelector, fields) {
  var formData = {};
  var email, phone, firstName, lastName, fullName;

  fields.forEach(function (f) {
    if (!f) return;
    var label = f.fieldName || f.id || 'field';
    var value = f.fieldValue;

    // Full form dump, keyed by field label — custom fields are read
    // downstream via wix_form_data.{label} dot-notation DLVs.
    formData[label] = value;

    var hay = (String(f.fieldName || '') + ' ' + String(f.id || '')).toLowerCase();
    if (!email && looksLikeEmail(value)) email = String(value).trim().toLowerCase();
    if (!phone && looksLikePhone(value)) phone = String(value).replace(/\D/g, '');
    if (!firstName && /first/.test(hay) && /name/.test(hay)) firstName = value;
    if (!lastName && /last/.test(hay) && /name/.test(hay)) lastName = value;
    if (!fullName && /name/.test(hay) &&
        !/first|last|user|company|file|business/.test(hay)) fullName = value;
  });

  return {
    event: DATALAYER_EVENT,
    wix_event_id: generateEventId(), // Meta Pixel + CAPI dedup key
    // Identity fields — best-effort detection across arbitrary form layouts
    wix_email: email || undefined,
    wix_phone: phone || undefined,
    wix_first_name: firstName || undefined,
    wix_last_name: lastName || undefined,
    wix_full_name: fullName || undefined,
    // Context
    wix_form_id: formSelector.replace(/^#/, ''),
    // Full payload — access any field via wix_form_data.{label}
    wix_form_data: formData
  };
}

function looksLikeEmail(v) {
  return typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

function looksLikePhone(v) {
  if (typeof v !== 'string') return false;
  if (!/^[\d\s()+\-.]+$/.test(v.trim())) return false;
  var digits = v.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

function generateEventId() {
  return String(Date.now()) + '_' + Math.random().toString(36).substring(2, 15);
}

// ---------------------------------------------------------------------------
// Hand-off to the Custom Element (which runs in the page window and can
// actually reach window.dataLayer). Data is passed via an attribute; because
// every payload carries a unique wix_event_id the value always changes, so
// attributeChangedCallback fires on every submit.
// ---------------------------------------------------------------------------

function forwardToDataLayer(payload) {
  var bridge;
  try {
    bridge = $w(BRIDGE_SELECTOR);
  } catch (err) {
    return;
  }
  if (!bridge || typeof bridge.setAttribute !== 'function') return;
  bridge.setAttribute('data-payload', JSON.stringify(payload));
}
