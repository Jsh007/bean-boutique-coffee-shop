/*
 * Eigbe Joshua, 224473, Frontend web development
 * Lists seeded `subscription` rows (member subscriptions archive).
 */

(function () {
  'use strict';

  function escapeHtml(raw) {
    return String(raw)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function money(n) {
    return '£' + Number(n).toFixed(2);
  }

  function intervalLabel(code) {
    var map = {
      weekly: 'Weekly',
      every_two_weeks: 'Every 2 weeks',
      every_three_weeks: 'Every 3 weeks',
      every_four_weeks: 'Every 4 weeks'
    };
    return map[String(code || '').toLowerCase()] || escapeHtml(String(code || '—'));
  }

  function aosAttrsForGridIndex(index) {
    void index;
    return ' data-aos="flip-up"';
  }

  function mount() {
    var root = document.querySelector('[data-subs-root]');
    var status = document.querySelector('[data-subs-status]');
    var moreBtn = document.querySelector('[data-subs-more]');
    var pageSize = 6;

    if (!root || !window.BeanBoutiqueDB) {
      if (status) status.textContent = 'IndexedDB helper missing.';
      return;
    }

    window.BeanBoutiqueDB.getAll('subscription').then(function (rows) {
      rows.sort(function (a, b) {
        return String(a.subscribeDate || '').localeCompare(String(b.subscribeDate || ''));
      });

      if (!rows.length) {
        root.innerHTML = '<p class="catalog-empty">No subscription archive—run setup import.</p>';
        if (moreBtn) moreBtn.hidden = true;
        return;
      }

      var visible = pageSize;

      function renderSubs() {
        var slice = rows.slice(0, visible);
        root.innerHTML = slice.map(function (sub, idx) {
          var href = 'items/subscription.html?id=' + encodeURIComponent(sub.id);
          return (
            '<article class="sub-card"' + aosAttrsForGridIndex(idx) + '>'
            + '<p class="plan-card__eyebrow">' + escapeHtml(sub.category) + ' · ' + escapeHtml(sub.commitment) + '</p>'
            + '<h2 class="sub-card__title"><a class="layout-link-accent" href="' + href + '">' + escapeHtml(sub.name) + '</a></h2>'
            + '<p class="layout-muted">' + escapeHtml(sub.description) + '</p>'
            + '<dl class="fact-grid sub-card__facts">'
            + '<div><dt>Renewal</dt><dd>' + intervalLabel(sub.interval) + '</dd></div>'
            + '<div><dt>Qty / drop</dt><dd>' + escapeHtml(String(sub.productQty)) + '</dd></div>'
            + '<div><dt>Prepaid</dt><dd>' + money(sub.totalPrice) + '</dd></div>'
            + '</dl>'
            + '<a class="btn btn_primary btn_compact" href="' + href + '">View agreement</a>'
            + '</article>'
          );
        }).join('');
        if (moreBtn) moreBtn.hidden = visible >= rows.length;
      }

      renderSubs();

      if (moreBtn) {
        moreBtn.addEventListener('click', function () {
          visible += pageSize;
          renderSubs();
        });
      }
    }).catch(function () {
      if (status) status.textContent = 'Unable to read subscriptions.';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
