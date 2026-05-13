<script>

/* 
 * GHL Form Submit Bridge
 * Loaded from https://github.com/whboggs/marketing-toolkit
 * Created by whboggs — https://whboggs.com — Get in touch for a free tracking audit.
 *
 * MIT License — Copyright (c) 2026 W.H. Boggs
 * https://github.com/whboggs/marketing-toolkit/blob/main/LICENSE
*/
  
(function() {
  // localStorage dedup — persists across sessions so the prefill rebroadcast
  // that GHL sends for returning contacts doesn't re-fire a Lead event.
  var STORAGE_PREFIX = 'ghl_fired_';
  
  function alreadyFired(submissionId) {
    try {
      return localStorage.getItem(STORAGE_PREFIX + submissionId) !== null;
    } catch (err) {
      // Private mode can block storage — fail open so real submits still fire
      return false;
    }
  }
  
  function markFired(submissionId) {
    try {
      localStorage.setItem(STORAGE_PREFIX + submissionId, '1');
    } catch (err) {
      // Silent — dedup lost but tags still fire
    }
  }
  
  window.addEventListener('message', function(event) {
    // Only accept messages from GHL's form widget origins
    if (event.origin.indexOf('leadconnectorhq.com') === -1 &&
        event.origin.indexOf('msgsndr.com') === -1) {
      return;
    }
    
    var data = event.data;
    
    // GHL form submit message shape:
    // [0] 'set-sticky-contacts' — event name
    // [1] '_ud' — payload type (skip the iframe meta variant)
    // [2] JSON string of contact + form data
    // [3] location_id
    // [4] submission UUID — used for dedup
    if (!Array.isArray(data) || data[0] !== 'set-sticky-contacts' || data[1] !== '_ud') {
      return;
    }
    
    // Cross-session dedup. Real new submits have new UUIDs and pass through.
    var submissionId = data[4];
    if (!submissionId || alreadyFired(submissionId)) return;
    markFired(submissionId);
    
    // Parse the JSON payload safely
    var payload;
    try {
      payload = JSON.parse(data[2]);
    } catch (err) {
      return;
    }
    if (!payload) return;
    
    // Generate event_id for Meta Pixel + future CAPI dedup
    function generateEventId() {
      return Date.now() + '_' + Math.random().toString(36).substring(2, 15);
    }
    
    // Normalize phone: GHL sends "+18015555555", Meta wants digits only
    var phone = payload.phone || '';
    phone = phone.replace(/\D/g, '');
    
    // Push standard fields that exist on every GHL form, plus full payload.
    // Client-specific custom fields are read from ghl_form_data via dot-notation DLVs.
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'ghl_form_submit',
      ghl_event_id: generateEventId(),
      // Identity fields — standard across all GHL forms
      ghl_email: (payload.email || '').toLowerCase(),
      ghl_phone: phone,
      ghl_first_name: payload.first_name || undefined,
      ghl_last_name: payload.last_name || undefined,
      ghl_country: payload.country || undefined,
      // Context fields — standard across all GHL forms
      ghl_location_id: data[3] || undefined,
      ghl_form_name: payload.source || undefined,
      ghl_submission_id: submissionId,
      // Full payload — clients access custom fields via ghl_form_data.{field_name}
      ghl_form_data: payload
    });
  });
})();
</script>
