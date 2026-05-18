/*
 * Eigbe Joshua, 224473, Frontend web development
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

  function percent(d) {
    var n = Number(d);
    if (!Number.isFinite(n)) {
      return '—';
    }
    return Math.round(n * 100) + '%';
  }

  function aosAttrsForGridIndex(index) {
    void index;
    return ' data-aos="flip-up"';
  }

  function mountPlans() {
    var root = document.querySelector('[data-plans-grid]');
    var status = document.querySelector('[data-plans-status]');
    var moreBtn = document.querySelector('[data-plans-more]');
    var pageSize = 6;

    if (!root || !window.BeanBoutiqueDB) {
      if (status) status.textContent = 'IndexedDB helper missing.';
      return;
    }

    window.BeanBoutiqueDB.getAll('subscriptionPlan').then(function (rows) {
      rows.sort(function (a, b) {
        return String(a.name).localeCompare(String(b.name));
      });

      if (!rows.length) {
        root.innerHTML = '<p class="catalog-empty">No subscription rows—import seed JSON.</p>';
        if (moreBtn) moreBtn.hidden = true;
        return;
      }

      var visible = pageSize;

      function renderPlans() {
        var slice = rows.slice(0, visible);
        root.innerHTML = slice.map(function (plan, idx) {
          var href = 'items/subscription-plan.html?id=' + encodeURIComponent(plan.id);
          return (
            '<article class="plan-card"' + aosAttrsForGridIndex(idx) + '>'
            + (plan.imageUrl
              ? (
                '<figure class="plan-card__figure">'
                + '<img class="plan-card__img" src="' + escapeHtml(plan.imageUrl) + '" alt="" loading="lazy" decoding="async">'
                + '</figure>'
              )
              : '')
            + '<p class="plan-card__eyebrow">' + escapeHtml(plan.category) + ' · ' + escapeHtml(plan.commitment) + '</p>'
            + '<h2 class="plan-card__title"><a class="layout-link-accent" href="' + href + '">' + escapeHtml(plan.name) + '</a></h2>'
            + '<p class="plan-card__summary">' + escapeHtml(plan.description) + '</p>'
            + '<ul class="plan-card__stats">'
            + '<li>Minimum qty · ' + escapeHtml(String(plan.minimumQty)) + '</li>'
            + '<li>Reward · ' + percent(plan.discount) + '</li>'
            + '</ul>'
            + '<p class="plan-card__cta"><a class="btn btn_primary btn_compact" href="' + href + '">View plan</a></p>'
            + '</article>'
          );
        }).join('');
        if (moreBtn) moreBtn.hidden = visible >= rows.length;
      }

      renderPlans();

      if (moreBtn) {
        moreBtn.addEventListener('click', function () {
          visible += pageSize;
          renderPlans();
        });
      }
    }).catch(function () {
      if (status) status.textContent = 'Unable to read subscription plans.';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountPlans);
  } else {
    mountPlans();
  }
})();
