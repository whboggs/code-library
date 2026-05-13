# Placement

## DLV - Placement
Determines the ad placement. Relies on utm_placement in url
**Example URL with UTMs**
```
utm_source={{site_source_name}}&utm_medium=paid_social&utm_campaign={{campaign.name}}&utm_content={{adset.name}}_{{ad.name}}&utm_placement={{placement}}
```

## Implementation

### (Option 1) Auto-Update Version
1. Create a Custom HTML Tag and paste this exactly:
```
<!-- 
  DLV - Placement
  Loaded from https://github.com/whboggs/marketing-toolkit
  Created by whboggs — https://whboggs.com — Get in touch for a free tracking audit.

  MIT License — Copyright (c) 2026 W.H. Boggs
  https://github.com/whboggs/marketing-toolkit/blob/main/LICENSE
-->

<script>
  var s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/gh/whboggs/marketing-toolkit@main/gtm-core/variables/placement/cjs-placement.js';
  s.async = true;
  document.head.appendChild(s);
</script>
```

### (Option 2) Manual Version
Copy/paste the contents of cjs-placement.js
