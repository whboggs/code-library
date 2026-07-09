/*!
 * Wix dataLayer Bridge — Custom Element
 * Loaded from https://github.com/whboggs/marketing-toolkit
 *
 * Companion to listener.js. Velo frontend code can't reliably push to
 * window.dataLayer, but a Wix Custom Element runs in the real page window
 * (the same context GTM loads in), so it can. The Velo listener sets a
 * `data-payload` attribute on this element; the element parses it and
 * pushes to the GTM dataLayer.
 *
 * Created by whboggs — https://whboggs.com — Get in touch for a free tracking audit.
 *
 * MIT License — Copyright (c) 2026 W.H. Boggs
 * https://github.com/whboggs/marketing-toolkit/blob/main/LICENSE
 *
 * SETUP (Wix Editor):
 *   1. Add Elements (+) > Embed & Social > Custom Element.
 *   2. Choose Source > "Velo file": put this file in public/custom-elements/
 *      and select it. (Or "Server URL": paste this file's jsDelivr URL.)
 *   3. Set the Tag Name to:  wix-datalayer-bridge
 *   4. Give the element the ID used in listener.js (default: dataLayerBridge).
 *      It renders nothing, so position/size don't matter.
 *   5. The element must exist on each page with a tracked form. Site-wide:
 *      classic Editor = right-click > Show on All Pages (or the footer);
 *      Wix Studio = place it in a Global Section. See README for details.
 */

class WixDataLayerBridge extends HTMLElement {
  static get observedAttributes() {
    return ['data-payload'];
  }

  connectedCallback() {
    // Renders nothing — it's a transport, not UI.
    this.style.display = 'none';
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name !== 'data-payload' || !newValue || newValue === oldValue) return;

    var payload;
    try {
      payload = JSON.parse(newValue);
    } catch (err) {
      return;
    }
    if (!payload) return;

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(payload);
  }
}

if (!customElements.get('wix-datalayer-bridge')) {
  customElements.define('wix-datalayer-bridge', WixDataLayerBridge);
}
