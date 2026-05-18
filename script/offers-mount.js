/*
 * Eigbe Joshua, 224473, Frontend web development
 * Combined promo SKUs (coffee + equipment) filtered by isPromo.
 */

(function () {
  'use strict';

  function $(sel) {
    return document.querySelector(sel);
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

  function unitCoffee(row) {
    return row.isPromo && row.promoPrice != null ? Number(row.promoPrice) : Number(row.price);
  }

  function unitGear(row) {
    return row.isPromo && row.promoPrice != null ? Number(row.promoPrice) : Number(row.price);
  }

  function buildPriceMarkup(row, kind) {
    var base = Number(row.price);
    if (row.isPromo && row.promoPrice != null) {
      return (
        '<p class="catalog-card__price catalog-card__price_promo">'
        + '<s class="catalog-card__price-was">' + money(base) + '</s> '
        + '<span class="catalog-card__price-now">' + money(Number(row.promoPrice)) + '</span>'
        + '</p>'
      );
    }
    var unit = kind === 'coffee' ? unitCoffee(row) : unitGear(row);
    return '<p class="catalog-card__price">' + money(unit) + '</p>';
  }

  function aosAttrsForGridIndex(index) {
    void index;
    return ' data-aos="flip-up"';
  }

  function buildCard(row, kind, cardIndex) {
    var href = kind === 'coffee'
      ? '../../products/coffee/items/product.html?id=' + encodeURIComponent(row.id)
      : '../../products/equipment/items/product.html?id=' + encodeURIComponent(row.id);
    var title = kind === 'coffee' ? 'Coffee · ' + row.name : 'Gear · ' + row.name;
    return (
      '<article class="catalog-card catalog-card_type_offer"' + aosAttrsForGridIndex(cardIndex) + '>'
      + '<a class="catalog-card__media" href="' + href + '">'
      + '<img class="catalog-card__img" src="' + escapeHtml(row.imageUrl) + '" loading="lazy" alt="">'
      + '<span class="catalog-card__ribbon">Promo</span>'
      + '</a>'
      + '<div class="catalog-card__body">'
      + '<p class="catalog-card__sku">' + escapeHtml(row.sku) + '</p>'
      + '<h2 class="catalog-card__title"><a class="catalog-card__title-link" href="' + href + '">' + escapeHtml(title) + '</a></h2>'
      + '<p class="catalog-card__excerpt">' + escapeHtml(row.description) + '</p>'
      + buildPriceMarkup(row, kind)
      + '<div class="catalog-card__cta">'
      + '<button type="button" class="btn btn_primary btn_compact" data-add-cart data-product-category="' + (kind === 'coffee' ? 'coffee' : 'equipment') + '" data-product-id="' + escapeHtml(row.id) + '">Add to cart</button>'
      + '</div>'
      + '</div></article>'
    );
  }

  function mount() {
    var grid = $('[data-offers-grid]');
    var status = $('[data-offers-status]');
    var more = $('[data-offers-more]');
    var pageSize = 6;
    var visible = pageSize;

    if (!grid || !window.BeanBoutiqueDB) {
      if (status) status.textContent = 'IndexedDB unavailable.';
      return;
    }

    grid.addEventListener('click', function (evt) {
      var btn = evt.target.closest('[data-add-cart]');
      if (!btn) {
        return;
      }
      evt.preventDefault();
      var cat = btn.getAttribute('data-product-category');
      var pid = btn.getAttribute('data-product-id');
      btn.disabled = true;
      window.BeanBoutiqueDB.addProductToCart(cat, pid).then(function () {
        btn.textContent = 'Added ✓';
        window.setTimeout(function () {
          btn.textContent = 'Add to cart';
          btn.disabled = false;
        }, 1000);
      }).catch(function () {
        btn.disabled = false;
      });
    });

    Promise.all([
      window.BeanBoutiqueDB.getAll('coffee'),
      window.BeanBoutiqueDB.getAll('equipment')
    ]).then(function (pairs) {
      var promos = [].concat(
        pairs[0].filter(function (row) {
          return row.isPromo;
        }).map(function (row) {
          return { kind: 'coffee', row: row };
        }),
        pairs[1].filter(function (row) {
          return row.isPromo;
        }).map(function (row) {
          return { kind: 'equipment', row: row };
        })
      ).sort(function (a, b) {
        return a.row.name.localeCompare(b.row.name);
      });

      if (!promos.length) {
        grid.innerHTML = '<p class="catalog-empty">No promotional SKUs flagged—reload seed JSON.</p>';
        if (more) more.hidden = true;
        return;
      }

      function render() {
        var slice = promos.slice(0, visible);
        grid.innerHTML = slice.map(function (entry, idx) {
          return buildCard(entry.row, entry.kind, idx);
        }).join('');
        if (more) more.hidden = visible >= promos.length;
      }

      render();

      if (more) {
        more.addEventListener('click', function () {
          visible += pageSize;
          render();
        });
      }
    }).catch(function () {
      if (status) status.textContent = 'Unable to assemble promo catalogue.';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
