<?php
/**
 * Marketing Toolkit — Gravity Forms fbc/fbp Populator
 * Version: v1.0.0
 * Last updated: 2026-05-15
 * https://github.com/whboggs/marketing-toolkit
 *
 * Packaged by W.H. Boggs — https://whboggs.com
 * → Free Meta Ads audit: https://whboggs.com/audit
 *
 * Auto-populates two Gravity Forms hidden fields with the visitor's Meta
 * tracking cookies (_fbc, _fbp) so they can be sent server-side via the
 * Conversions API at form submission.
 *
 * Setup:
 *   1. In Gravity Forms, add two Hidden fields to your form.
 *   2. On each field's Advanced tab, check "Allow field to be populated
 *      dynamically" and set Parameter Name to `fbc` and `fbp` respectively.
 *   3. Drop this snippet into your theme's functions.php, or paste it into a
 *      PHP snippet plugin (WPCode, Code Snippets, etc.).
 *
 * MIT License | Copyright (c) 2026 W.H. Boggs
 */

add_filter('gform_field_value_fbc', function () {
    return isset($_COOKIE['_fbc']) ? sanitize_text_field($_COOKIE['_fbc']) : '';
});

add_filter('gform_field_value_fbp', function () {
    return isset($_COOKIE['_fbp']) ? sanitize_text_field($_COOKIE['_fbp']) : '';
});
