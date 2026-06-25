<script>
/*! GHL Chat Widget Bridge - open + lead submit (polling build) */
(function () {
  window.dataLayer = window.dataLayer || [];
  console.log('[ghl-chat] tag ran'); // proves the tag executed

  // event_id for Meta Pixel + CAPI dedup (same approach as the form bridge)
  function generateEventId() {
    return Date.now() + '_' + Math.random().toString(36).substring(2, 15);
  }

  var wasActive = false;    // last known open/closed state
  var submitHooked = false; // ensures registerBeforeSubmit runs only once
  var attached = false;     // one-time "ready" log

  // Poll for the widget API (LC_chatWidgetLoaded does not fire on this build).
  setInterval(function () {
    var lc = window.leadConnector && window.leadConnector.chatWidget;
    if (!lc || !lc.isLoaded) return; // widget not ready yet

    if (!attached) {
      attached = true;
      console.log('[ghl-chat] chatWidget ready');
    }

    // --- Register the lead submit hook ONCE (not every poll tick) ---
    if (!submitHooked && typeof lc.registerBeforeSubmit === 'function') {
      submitHooked = true;
      lc.registerBeforeSubmit(function (values, host) {
        // Log the real payload so we can confirm the actual field keys
        console.log('[ghl-chat] beforeSubmit fired, values:', values);

        // NOTE: key names assumed - adjust these after reading the log above
        var email = (values && values.email ? values.email : '').toLowerCase();
        var phone = (values && values.phone ? values.phone : '').replace(/\D/g, '');

        window.dataLayer.push({
          event: 'ghl_chat_submit',
          ghl_event_id: generateEventId(),
          ghl_email: email || undefined,
          ghl_phone: phone || undefined,
          ghl_chat_data: values // full payload - custom fields via dot-notation DLVs
        });
        console.log('[ghl-chat] pushed ghl_chat_submit');

        return true; // CRITICAL: returning false blocks the chat submission
      });
      console.log('[ghl-chat] submit hook registered');
    }

    // --- Open tracking: push only on a closed -> open flip ---
    if (typeof lc.isActive === 'function') {
      var isActive = lc.isActive();
      if (isActive !== wasActive) {
        wasActive = isActive;
        if (isActive) {
          window.dataLayer.push({ event: 'ghl_chat_open' });
          console.log('[ghl-chat] pushed ghl_chat_open');
        }
      }
    }
  }, 500); // twice a second; light enough to leave running
})();
</script>
