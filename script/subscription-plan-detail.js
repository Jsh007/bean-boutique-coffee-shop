/*
 * Eigbe Joshua, 224473, Frontend web development
 */

(function () {
  'use strict';

  var PROFILE_KEY = 'bbe_demo_profile_id';

  var INTERVAL_VALUES = ['weekly', 'every_two_weeks', 'every_three_weeks', 'every_four_weeks'];
  var INTERVAL_LABELS = ['Weekly', 'Every 2 weeks', 'Every 3 weeks', 'Every 4 weeks'];

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

  function percent(d) {
    return Math.round(Number(d) * 100) + '%';
  }

  function computeExpireIso(commitment) {
    var m = String(commitment || '').match(/(\d+)\s*month/i);
    var months = m ? parseInt(m[1], 10) : 12;
    var d = new Date();
    d.setMonth(d.getMonth() + months);
    return d.toISOString();
  }

  function quoteAmount(unit, qty, discount) {
    return Number(unit) * Number(qty) * (1 - Number(discount));
  }

  function setBreadcrumbCurrent(text) {
    var el = document.querySelector('[data-breadcrumb-root] [data-breadcrumb-current]');
    if (el) el.textContent = text || '';
  }

  function mount() {
    var root = document.querySelector('[data-plan-root]');
    if (!root || !window.BeanBoutiqueDB) {
      return;
    }

    var id = qs('id');
    if (!id) {
      setBreadcrumbCurrent('Missing plan id');
      root.innerHTML = '<p class="layout-muted">Missing plan id.</p>';
      return;
    }

    window.BeanBoutiqueDB.getRecord('subscriptionPlan', id).then(function (plan) {
      if (!plan) {
        setBreadcrumbCurrent('Plan not found');
        root.innerHTML = '<p class="layout-muted">Plan not found.</p>';
        return;
      }

      setBreadcrumbCurrent(plan.name || '');

      var storeName = plan.category === 'coffee' ? 'coffee' : 'equipment';
      return window.BeanBoutiqueDB.getRecord(storeName, plan.productId).then(function (prod) {
        var unit = prod && prod.isPromo && prod.promoPrice != null ? prod.promoPrice : prod ? prod.price : null;
        var planImgSrc = (plan.imageUrl || '').trim() || (prod && prod.imageUrl) || '';

        var intervalSelect = '';
        INTERVAL_VALUES.forEach(function (val, idx) {
          intervalSelect += '<option value="' + val + '">' + INTERVAL_LABELS[idx] + '</option>';
        });

        root.innerHTML = (
          '<article class="subscription-detail">'
          + '<header class="subscription-detail__header">'
          + '<div>'
          + '<p class="plan-card__eyebrow">' + escapeHtml(plan.category) + ' · prepaid</p>'
          + '<h1 class="subscription-detail__title">' + escapeHtml(plan.name) + '</h1>'
          + '<p>' + escapeHtml(plan.description) + '</p>'
          + '</div>'
          + (planImgSrc ? '<div class="subscription-detail__aside"><img src="' + escapeHtml(planImgSrc) + '" alt="" class="subscription-detail__product-img"></div>' : '')
          + '</header>'
          + '<section class="subscription-detail__facts">'
          + '<dl class="fact-grid">'
          + '<div><dt>Commitment</dt><dd>' + escapeHtml(plan.commitment) + '</dd></div>'
          + '<div><dt>Qty floor</dt><dd>' + escapeHtml(String(plan.minimumQty)) + '</dd></div>'
          + '<div><dt>Loyalty reward</dt><dd>' + percent(plan.discount) + '</dd></div>'
          + '</dl>'
          + '</section>'
          + '<section class="subscription-detail__form">'
          + '<label class="subscription-field">'
          + '<span>Ship cadence</span>'
          + '<select class="catalog-search" id="subscription-interval" aria-label="Ship cadence">' + intervalSelect + '</select>'
          + '</label>'
          + '<label class="subscription-field">'
          + '<span>Quantity per drop</span>'
          + '<input class="catalog-search" id="subscription-qty" type="number" min="' + plan.minimumQty + '" value="' + plan.minimumQty + '">'
          + '</label>'
          + '</section>'
          + '<footer class="subscription-detail__pricing">'
          + '<p>Prepaid estimate: '
          + '<strong data-plan-quote>'
          + (unit != null ? money(quoteAmount(unit, plan.minimumQty, plan.discount)) : 'Awaiting product linkage')
          + '</strong></p>'
          + '<p class="layout-muted" data-subscribe-feedback hidden></p>'
          + '<button type="button" class="btn btn_primary btn_compact" data-plan-subscribe>Subscribe</button>'
          + '</footer>'
          + '</article>'
        );

        var qtyInput = root.querySelector('#subscription-qty');
        var intervalSel = root.querySelector('#subscription-interval');
        var quote = root.querySelector('[data-plan-quote]');
        var btn = root.querySelector('[data-plan-subscribe]');
        var feedback = root.querySelector('[data-subscribe-feedback]');

        function rebuildQuote() {
          if (!prod || !qtyInput || !quote || unit == null) {
            return;
          }
          var qty = Number(qtyInput.value || plan.minimumQty);
          if (qty < plan.minimumQty) {
            qty = plan.minimumQty;
            qtyInput.value = qty;
          }
          quote.textContent = money(quoteAmount(unit, qty, plan.discount));
        }

        if (qtyInput) {
          qtyInput.addEventListener('input', rebuildQuote);
        }

        if (btn) {
          btn.addEventListener('click', function () {
            if (!window.BeanBoutiqueDB.putRecord) {
              return;
            }
            var qty = qtyInput ? Number(qtyInput.value || plan.minimumQty) : plan.minimumQty;
            if (qty < plan.minimumQty) {
              qty = plan.minimumQty;
              if (qtyInput) qtyInput.value = qty;
            }
            if (unit == null) {
              if (feedback) {
                feedback.hidden = false;
                feedback.textContent = 'Product link missing—re-import demo data.';
              }
              return;
            }

            var intervalCode = intervalSel && intervalSel.value ? intervalSel.value : INTERVAL_VALUES[0];
            var userId = 'user-01';
            try {
              userId = window.localStorage.getItem(PROFILE_KEY) || 'user-01';
            } catch (ignore) {}

            var total = quoteAmount(unit, qty, plan.discount);
            var subId = 'subscription-live-' + Date.now();
            var payload = {
              id: subId,
              planId: plan.id,
              productId: plan.productId,
              userId: userId,
              name: 'Active prepaid · ' + plan.name,
              description: plan.description,
              category: plan.category,
              productQty: qty,
              totalPrice: Number(total.toFixed(2)),
              subscribeDate: new Date().toISOString(),
              expireDate: computeExpireIso(plan.commitment),
              commitment: plan.commitment,
              interval: intervalCode,
              createdDate: new Date().toISOString()
            };

            btn.disabled = true;
            window.BeanBoutiqueDB.putRecord('subscription', payload).then(function () {
              if (feedback) {
                feedback.hidden = false;
                feedback.innerHTML = 'Subscription saved locally. '
                  + '<a class="layout-link-accent" href="../../subscriptions/items/subscription.html?id='
                  + encodeURIComponent(subId) + '">View your agreement</a>'
                  + ' · <a class="layout-link-accent" href="../../subscriptions/subscriptions.html">All subscriptions</a>.';
              }
              btn.textContent = 'Subscribed';
            }).catch(function () {
              btn.disabled = false;
              if (feedback) {
                feedback.hidden = false;
                feedback.textContent = 'Could not write subscription—check IndexedDB permissions.';
              }
            });
          });
        }

        rebuildQuote();
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
