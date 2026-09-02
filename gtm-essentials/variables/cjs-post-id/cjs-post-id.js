/*
 * cJS - Post ID
 * Version: v1.0.0
 * Last updated: 2026-08-03
 * The WordPress post/page ID, parsed from the postid-### / page-id-### body
 * class (e.g. <body class="... postid-482 ...">).
 */

function() {
  var m = (document.body.className || '').match(/(?:postid|page-id)-(\d+)/);
  return m ? m[1] : undefined;
}
