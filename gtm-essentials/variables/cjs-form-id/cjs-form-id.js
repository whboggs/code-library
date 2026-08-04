/*
 * cJS - Form ID
 * The id of the first <form> on the page.
 * For the SUBMITTED form's id, use an Auto-Event Variable (Element ID) on a
 * Form Submission trigger instead.
 */

function() {
  var f = document.querySelector('form[id]');
  return f ? f.id : undefined;
}
