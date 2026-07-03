<script>
  // Note: Requires cJS - Traffic Source and cJS - Ad Placement.
  // Delete these lines if you do not want to add these parameters.
fbq('track', 'Lead', {
  lead_type: 'Form Submit', // Define Lead Type
  traffic_source: '{{cJS - Traffic Source}}', // Finds Last Touch traffic source
  content_name: '{{Page Path}}', // Finds page path
  ad_placement: '{{cJS - Ad Placement}}' // Finds ad placement
});
</script>
