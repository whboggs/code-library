/*
 * cJS - Boolean - <cookie> Exists
 *
 * Returns true when the referenced variable resolves to a truthy value.
 * In the GTM Essentials import, one of these is generated per first-party
 * cookie variable — e.g. "cJS - Boolean - _fbc Exists" references
 * {{1PC - _fbc}}. Swap {{insert_source_variable}} for the variable you want
 * to test.
 */

function() {
  return !!{{insert_source_variable}};
}
