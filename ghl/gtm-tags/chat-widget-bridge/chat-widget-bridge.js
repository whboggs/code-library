<script>
/*!
 * GHL Chat Widget Lead Bridge
 * Hooks the LeadConnector chat widget's pre-chat form submit and pushes
 * a conversion event to dataLayer for GTM/Meta CAPI. By whboggs.
 */
(function () {
  window.dataLayer = window.dataLayer || []; // ensure dataLayer exists

  // event_id for Meta Pixel + CAPI dedup (same approach as the form bridge)
  function generateEventId() {
    return Date.now() + '_' + Math.random().toString(36).substring(2, 15);
  }

  // GHL fires LC_chatWidgetLoaded once the widget mounts. We must be listening
  // before that happens — see the trigger note below the snippet.
  window.addEventListener('LC_chatWidgetLoaded', function (e) {
    var lc = window.leadConnector && window.leadConnector.chatWidget;
    if (!lc || !lc.registerBeforeSubmit) return; // bail if the API isn't present

    // registerBeforeSubmit runs right as the visitor submits the pre-chat form.
    // `values` holds the entered fields. MUST return true or the submit is blocked.
    lc.registerBeforeSubmit(function (values, host) {
      // Normalize identity fields for Meta advanced matching / CAPI.
      // NOTE: confirm the actual `values` keys in GTM Preview before trusting these.
      var email = (values && values.email ? values.email : '').toLowerCase();
      var phone = (values && values.phone ? values.phone : '').replace(/\D/g, '');

      window.dataLayer.push({
        event: 'ghl_chat_submit',
        ghl_event_id: generateEventId(),
        ghl_email: email || undefined,
        ghl_phone: phone || undefined,
        ghl_chat_data: values // full payload — read custom fields via dot-notation
