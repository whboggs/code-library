# GHL Form Submit Bridge

External bridge that listens for GoHighLevel iframe form submits and pushes
to the GTM dataLayer.

## Required GTM variables

DLV variables (Data Layer Variable type, name → key):
- DLV - GHL Email → ghl_email
- DLV - GHL Phone → ghl_phone
- DLV - GHL First Name → ghl_first_name
- DLV - GHL Last Name → ghl_last_name
- DLV - GHL Country → ghl_country
- DLV - GHL Location ID → ghl_location_id
- DLV - GHL Form Name → ghl_form_name
- DLV - GHL Submission ID → ghl_submission_id
- DLV - GHL Event ID → ghl_event_id
- DLV - GHL Form Data → ghl_form_data

## Custom JS variables
*Find these in gtm-core*
- cJS - GHL Email (Normalized)
- cJS - GHL Phone (E.164)

## GTM tag content
1. Create a Custom HTML Tag
2. Copy/Paste from form-submit-bridge.html

## GTM tag settings

- Trigger: All Pages (Page View)
- Fire once per page: checked
- Support document.write: unchecked
