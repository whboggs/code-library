# Custom Form Submit
This cHTML tag creates a custom form submit event to help with deduplication issues.
Use this as your Form Submit Event Trigger.

Detects standard HTML forms (full-page navigation, or AJAX success blocks from
Webflow, Contact Form 7, Gravity Forms, WPForms, Elementor, and Formidable) as
well as Framer's native forms via Framer's `framer:formsubmit` event.

**Framer note:** Framer only emits `framer:formsubmit` for forms that have a
Tracking ID set in the form's properties panel — set one on each form you want
tracked, or the tag will receive nothing.
