/*!
 * Marketing Toolkit — Gravity Forms GTM Listener v1.0.0
 * https://github.com/whboggs/marketing-toolkit
 *
 * Packaged by W.H. Boggs — https://whboggs.com
 * → Free Meta Ads audit: https://whboggs.com/audit
 *
 * MIT License | Copyright (c) 2026 W.H. Boggs
 */

(() => {
  window.dataLayer = window.dataLayer || [];

  // Gravity Forms emits its events through jQuery — bind once jQuery is present
  // We load async, so jQuery may not be ready yet; poll briefly before giving up
  let attempts = 0;
  const maxAttempts = 50; // ~5s at 100ms intervals

  function bind() {
    const $ = window.jQuery;
    if (!$) {
      if (++attempts >= maxAttempts) {
        console.warn('[mt] Gravity Forms listener: jQuery never loaded, aborting');
        return;
      }
      setTimeout(bind, 100);
      return;
    }

    // Fires when an AJAX-submitted Gravity Form displays its confirmation message
    // https://docs.gravityforms.com/gform_confirmation_loaded/
    $(document).on('gform_confirmation_loaded', function (event, formId) {
      window.dataLayer.push({
        event: 'gforms_form_success',
        gforms_form_id: formId
      });
    });

    // Fires when a user navigates to a new page in a multi-page form
    // https://docs.gravityforms.com/gform_page_loaded/
    $(document).on('gform_page_loaded', function (event, formId, currentPage) {
      window.dataLayer.push({
        event: 'gforms_page_loaded',
        gforms_form_id: formId,
        gforms_current_page: currentPage
      });
    });
  }

  bind();
})();
