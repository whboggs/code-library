/*
 * cJS - Form ID
 * Version: v1.0.0
 * Last updated: 2026-08-03
 * The id of the first <form> on the page.
 * For the SUBMITTED form's id, use an Auto-Event Variable (Element ID) on a
 * Form Submission trigger instead.
 */

function() {
  var f = document.querySelector('form[id]');
  return f ? f.id : undefined;
}
