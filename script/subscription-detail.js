/*
 * Eigbe Joshua, 224473, Frontend web development
 * Member subscription PDP (query string id).
 */

(function () {
  'use strict';

  function qs(name) {
    return new URLSearchParams(window.location.search || '').get(name);
  }

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

  /** ISO timestamp or date string → YYYY-MM-DD (calendar date from ISO literal before "T"). */
  function formatIsoDateYYYYMMDD(value) {
    if (value == null || value === '') {
      return '—';
    }
    var s = String(value).trim();
    if (!s) {
      return '—';
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
      return escapeHtml(s.substring(0, 10));
    }
    var d = new Date(s);
    if (Number.isNaN(d.getTime())) {
      return escapeHtml(s);
    }
    var y = d.getFullYear();
    var m = d.getMonth() + 1;
    var day = d.getDate();
    return escapeHtml(
      y + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day
    );
  }

  function setBreadcrumbCurrent(text) {
    var el = document.querySelector('[data-breadcrumb-root] [data-breadcrumb-current]');
    if (el) el.textContent = text || '';
  }

  function mount() {
    var root = document.querySelector('[data-subscription-root]');
    if (!root || !window.BeanBoutiqueDB) {
      return;
    }

    var id = qs('id');
    if (!id) {
      setBreadcrumbCurrent('Missing subscription id');
      root.innerHTML = '<p class="layout-muted">Missing subscription id.</p>';
      return;
    }

    window.BeanBoutiqueDB.getRecord('subscription', id).then(function (sub) {
      if (!sub) {
        setBreadcrumbCurrent('Subscription not found');
        root.innerHTML = '<p class="layout-muted">Subscription not found.</p>';
        return;
      }

      setBreadcrumbCurrent(sub.name || '');

      return Promise.all([
        window.BeanBoutiqueDB.getRecord('user', sub.userId),
        window.BeanBoutiqueDB.getRecord('subscriptionPlan', sub.planId),
        window.BeanBoutiqueDB.getRecord(
          sub.category === 'coffee' ? 'coffee' : 'equipment',
          sub.productId
        ),
        window.BeanBoutiqueDB.getAll('subscription')
      ]).then(function (tuple) {
        var member = tuple[0];
        var plan = tuple[1];
        var prod = tuple[2];
        var allSubs = tuple[3] || [];

        var memberLine = member
          ? escapeHtml(member.firstName + ' ' + member.lastName + ' · ' + member.emailAddress)
          : 'Member id · ' + escapeHtml(sub.userId);

        var related = allSubs.filter(function (s) {
          return s && s.userId === sub.userId && s.id !== sub.id;
        });
        related.sort(function (a, b) {
          return String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' });
        });

        var articleHtml = (
          '<article class="subscription-detail">'
          + '<header class="subscription-detail__header">'
          + '<div>'
          + '<p class="plan-card__eyebrow">' + escapeHtml(sub.category) + ' · active agreement</p>'
          + '<h1 class="subscription-detail__title">' + escapeHtml(sub.name) + '</h1>'
          + '<p class="layout-muted">' + escapeHtml(sub.description) + '</p>'
          + '<p class="layout-muted">' + memberLine + '</p>'
          + '</div>'
          + (prod ? '<div class="subscription-detail__aside"><img src="' + escapeHtml(prod.imageUrl) + '" alt="" class="subscription-detail__product-img"></div>' : '')
          + '</header>'
          + '<section class="subscription-detail__facts">'
          + '<dl class="fact-grid">'
          + '<div><dt>Started</dt><dd>' + formatIsoDateYYYYMMDD(sub.subscribeDate) + '</dd></div>'
          + '<div><dt>Renews until</dt><dd>' + formatIsoDateYYYYMMDD(sub.expireDate) + '</dd></div>'
          + '<div><dt>Cadence</dt><dd>' + intervalLabel(sub.interval) + '</dd></div>'
          + '<div><dt>Commitment</dt><dd>' + escapeHtml(sub.commitment) + '</dd></div>'
          + '<div><dt>Ship qty</dt><dd>' + escapeHtml(String(sub.productQty)) + '</dd></div>'
          + '<div><dt>Totals captured</dt><dd>' + money(sub.totalPrice) + '</dd></div>'
          + '</dl>'
          + '</section>'
          + (plan ? '<section class="layout-muted subscription-detail__bridge"><p>Linked plan · <a class="layout-link-accent" href="../../subscription-plans/items/subscription-plan.html?id=' + encodeURIComponent(plan.id) + '">' + escapeHtml(plan.name) + '</a></p></section>' : '')
          + '</article>'
        );

        return Promise.all(related.map(function (r) {
          var store = r.category === 'equipment' ? 'equipment' : 'coffee';
          return window.BeanBoutiqueDB.getRecord(store, r.productId).then(function (product) {
            return { sub: r, product: product };
          });
        })).then(function (pairs) {
          var relatedHtml = '';
          if (pairs.length) {
            var cards = pairs.map(function (pair, idx) {
              var rSub = pair.sub;
              var product = pair.product;
              var imgUrl = product && product.imageUrl ? escapeHtml(product.imageUrl) : '';
              var thumb = imgUrl
                ? '<img class="profile-sub-card__img" src="' + imgUrl + '" alt="" width="56" height="56" loading="lazy">'
                : '<span class="profile-sub-card__img-fallback" aria-hidden="true"></span>';
              var href = 'subscription.html?id=' + encodeURIComponent(rSub.id);
              var dates = 'Started ' + formatIsoDateYYYYMMDD(rSub.subscribeDate) + ' · Renews through ' + formatIsoDateYYYYMMDD(rSub.expireDate);
              return (
                '<article class="profile-sub-card related-subscriptions__card"' + aosAttrsForGridIndex(idx) + '>'
                + '<div class="profile-sub-card__media">' + thumb + '</div>'
                + '<div class="profile-sub-card__body">'
                + '<h3 class="profile-sub-card__title"><a href="' + href + '">' + escapeHtml(rSub.name || 'Subscription') + '</a></h3>'
                + '<p class="profile-sub-card__meta">' + dates + ' · ' + money(rSub.totalPrice) + '</p>'
                + '</div></article>'
              );
            }).join('');
            relatedHtml = (
              '<section class="related-products related-subscriptions layout__section" aria-labelledby="related-subscriptions-heading">'
              + '<h2 id="related-subscriptions-heading" class="layout__section-title">Related subscriptions</h2>'
              + '<p class="layout-muted related-subscriptions__lede">Other active agreements for the same member.</p>'
              + '<div class="related-subscriptions__grid">' + cards + '</div>'
              + '</section>'
            );
          }
          root.innerHTML = articleHtml + relatedHtml;
        });
      });
    }).catch(function () {
      setBreadcrumbCurrent('IndexedDB unavailable');
      root.innerHTML = '<p class="layout-muted">IndexedDB unavailable.</p>';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
