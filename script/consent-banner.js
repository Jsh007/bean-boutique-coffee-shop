/*
 * Eigbe Joshua, 224473, Frontend web development
 * Lightweight privacy / storage acknowledgement bar (coursework "security & consent" widget).
 */

(function () {
  'use strict';

  var KEY = 'bbe_privacy_acknowledged';

  function buildBanner() {
    if (window.localStorage && window.localStorage.getItem(KEY) === 'true') {
      return;
    }

    var banner = document.createElement('div');
    banner.className = 'privacy-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-modal', 'false');
    banner.setAttribute('aria-label', 'Privacy notice');

    banner.innerHTML = ''
      + '<div class="privacy-banner__layout">'
      + '<p class="privacy-banner__copy"><strong>Local prototype only.</strong> This is a project assignment for the NCC-L4DC frontend web development course unit. Some data will be saved to your browser via localStorage and IndexedDB. Accepting acknowledges these storage boundaries.</p>'
      + '<div class="privacy-banner__actions">'
      + '<button type="button" class="btn btn_primary btn_compact privacy-banner__accept" data-privacy-accept>I Accept</button>'
      + '</div>'
      + '</div>';

    document.body.appendChild(banner);

    banner.querySelector('[data-privacy-accept]').addEventListener('click', function () {
      try {
        window.localStorage.setItem(KEY, 'true');
      } catch (err) {}
      banner.remove();
      document.documentElement.style.removeProperty('--privacy-offset');
    });

    document.documentElement.style.setProperty('--privacy-offset', '120px');
  }

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  ready(buildBanner);
})();
