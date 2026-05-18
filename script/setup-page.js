/*
 * Eigbe Joshua, 224473, Frontend web development
 * Binds the setup screen controls after the DOM + deferred scripts arrive.
 */

(function () {
  'use strict';

  var STORAGE_KEY = 'bbe_setup_complete';

  function qs(id) {
    return document.getElementById(id);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  if (window.BeanBoutiqueImporter) {
    window.BeanBoutiqueImporter.escapeHtml = escapeHtml;
  }

  function setStatus(box, variant, html) {
    if (!box) {
      return;
    }
    box.className =
      variant === 'ok'
        ? 'setup-feedback setup-feedback_success'
        : variant === 'err'
          ? 'setup-feedback setup-feedback_error'
          : variant === 'info'
            ? 'setup-feedback setup-feedback_info'
            : 'setup-feedback';
    box.innerHTML = html;
  }

  function showHome(show) {
    var group = qs('setup-home-links');
    if (group) {
      group.hidden = !show;
    }
  }

  function completeImport(feedbackEl) {
    try {
      window.localStorage.setItem(STORAGE_KEY, 'true');
    } catch (error) {
      setStatus(feedbackEl, 'err',
        '<p>IndexedDB synced, but persistent storage for the completion flag failed. Continue anyway—you may revisit setup after clears.</p>');
      showHome(true);
      return;
    }
    setStatus(feedbackEl, 'ok',
      '<p>Catalogues synchronised locally—IndexedDB object stores populated.</p>');
    showHome(true);
  }

  function boot() {
    var jsonUrl = '';
    try {
      var root = document.querySelector('[data-demo-json-root]');
      jsonUrl = root ? root.getAttribute('data-demo-json-root') || '' : '';
    } catch (error) {
      jsonUrl = '';
    }

    var feedback = qs('setup-feedback');
    var importBtn = qs('setup-import');
    var rerunBtn = qs('setup-reset');

    try {
      if (window.localStorage.getItem(STORAGE_KEY) === 'true') {
        setStatus(feedback, 'info',
          '<p>This browser finished setup already. Pick <strong>Re-import catalogue</strong> whenever you wipe storage.</p>');
        showHome(true);
      } else {
        setStatus(feedback, 'info',
          '<p>First launch: hydrate Bean Boutique IndexedDB demo rows (coffee, gear, carts, patrons, bundles, RSVP rows).</p>');
        showHome(false);
      }
    } catch (error) {
      setStatus(feedback, 'info', '<p>Import data whenever you recreate the storefront database snapshot.</p>');
    }

    if (importBtn) {
      importBtn.addEventListener('click', function () {
        importBtn.disabled = true;
        if (rerunBtn) rerunBtn.disabled = true;
        setStatus(feedback, 'info', '<p>Import underway … please wait.</p>');

        if (!jsonUrl) {
          setStatus(feedback, 'err',
            '<p>Developer note: attach <code>data-demo-json-root</code> to the HTML element.</p>');
          importBtn.disabled = false;
          if (rerunBtn) rerunBtn.disabled = false;
          return;
        }

        window.BeanBoutiqueImporter.fetchAndImportSeed(jsonUrl).then(function () {
          completeImport(feedback);
        }).catch(function (error) {
          var message = error && error.message ? error.message : String(error);
          setStatus(feedback, 'err',
            '<p>Could not synchronise IndexedDB.</p><p class="layout-muted">' + escapeHtml(message) + '</p>'
            + '<p>Tip: serve this directory over HTTP (see README); <code>file://</code> blocks <code>fetch</code>.</p>');
        }).finally(function () {
          importBtn.disabled = false;
          if (rerunBtn) rerunBtn.disabled = false;
        });
      });
    }

    if (rerunBtn) {
      rerunBtn.addEventListener('click', function () {
        try {
          window.localStorage.removeItem(STORAGE_KEY);
        } catch (error) {
          /** ignore **/
        }
        setStatus(feedback, 'info', '<p>Setup flag erased on this browser profile—import again anytime.</p>');
        showHome(false);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
