/*
 * cJS - Post Title
 * The page's post/article title: the .entry-title / first h1, falling back to
 * the og:title meta tag.
 */

function() {
  var el = document.querySelector('.entry-title, h1.entry-title, h1');
  if (el && el.textContent) return el.textContent.trim();
  var og = document.querySelector('meta[property="og:title"]');
  return og ? og.getAttribute('content') : undefined;
}
