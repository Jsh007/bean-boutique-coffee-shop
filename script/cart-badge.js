/*
 * Eigbe Joshua, 224473, Frontend web development
 * Header cart qty badge (sum of line quantities).
 */

(function () {
  'use strict';

  function cartQtyTotal(lines) {
    return (lines || []).reduce(function (sum, row) {
      return sum + Number(row.qty || 0);
    }, 0);
  }

  function refresh() {
    if (!window.BeanBoutiqueDB || typeof window.BeanBoutiqueDB.getAll !== 'function') {
      return;
    }

    window.BeanBoutiqueDB.getAll('cart').then(function (lines) {
      var n = cartQtyTotal(lines);
      var label = n === 0 ? 'Shopping basket' : 'Shopping basket, ' + n + (n === 1 ? ' item' : ' items');

      document.querySelectorAll('[data-cart-count]').forEach(function (badge) {
        badge.textContent = n > 99 ? '99+' : String(n);
        badge.hidden = n === 0;
        badge.setAttribute('aria-hidden', n === 0 ? 'true' : 'false');
      });

      document.querySelectorAll('[data-cart-link]').forEach(function (link) {
        link.setAttribute('aria-label', label);
      });
    }).catch(function () {
      /** ignore **/
    });
  }

  document.addEventListener('beanboutique:cart-changed', refresh);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', refresh);
  } else {
    refresh();
  }
})();
