/*
 * cJS - Post ID
 * The WordPress post/page ID, parsed from the postid-### / page-id-### body
 * class (e.g. <body class="... postid-482 ...">).
 */

function() {
  var m = (document.body.className || '').match(/(?:postid|page-id)-(\d+)/);
  return m ? m[1] : undefined;
}
