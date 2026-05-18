/*
 * Eigbe Joshua, 224473, Frontend web development
 */

(function () {
  'use strict';

  function qs(name) {
    var params = new URLSearchParams(window.location.search || '');
    return params.get(name);
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

  function coffeePriceMarkup(row) {
    var weight = escapeHtml(row.weight || '1kg');
    if (row.isPromo && row.promoPrice != null) {
      return (
        '<p class="product-detail__price product-detail__price_promo">'
        + '<s class="product-detail__price-was">' + money(row.price) + '</s> '
        + '<span class="product-detail__price-now">' + money(row.promoPrice) + '</span>'
        + '<span class="product-detail__price-uom"> / ' + weight + '</span>'
        + '</p>'
      );
    }
    var unit = row.price;
    return '<p class="product-detail__price">' + money(unit) + ' / ' + weight + '</p>';
  }

  function equipmentPriceMarkup(row) {
    if (row.isPromo && row.promoPrice != null) {
      return (
        '<p class="product-detail__price product-detail__price_promo">'
        + '<s class="product-detail__price-was">' + money(row.price) + '</s> '
        + '<span class="product-detail__price-now">' + money(row.promoPrice) + '</span>'
        + '</p>'
      );
    }
    return '<p class="product-detail__price">' + money(row.price) + '</p>';
  }

  function setBreadcrumbCurrent(text) {
    var el = document.querySelector('[data-breadcrumb-root] [data-breadcrumb-current]');
    if (el) el.textContent = text || '';
  }

  function bindPdpCart(rootEl, category, pid) {
    var btn = rootEl.querySelector('[data-add-cart-pdp]');
    if (!btn || !window.BeanBoutiqueDB || typeof window.BeanBoutiqueDB.addProductToCart !== 'function') {
      return;
    }
    btn.addEventListener('click', function () {
      btn.disabled = true;
      window.BeanBoutiqueDB.addProductToCart(category, pid).then(function () {
        var label = btn.textContent;
        btn.textContent = 'Added to basket ✓';
        window.setTimeout(function () {
          btn.textContent = label;
          btn.disabled = false;
        }, 1100);
      }).catch(function () {
        btn.textContent = 'Import catalogue first';
        window.setTimeout(function () {
          btn.textContent = 'Add to basket';
          btn.disabled = false;
        }, 1400);
      });
    });
  }

  function relatedSectionTitle(store) {
    return store === 'coffee' ? 'Related coffees' : 'Related equipment';
  }

  function relatedEyebrow(store) {
    return store === 'coffee' ? 'Coffee' : 'Equipment';
  }

  function relatedPriceMarkup(row, store) {
    if (store === 'coffee') {
      var weight = escapeHtml(row.weight || '1kg');
      if (row.isPromo && row.promoPrice != null) {
        return '<s class="layout-muted">' + money(row.price) + '</s> ' + money(row.promoPrice) + ' / ' + weight;
      }
      return money(row.price) + ' / ' + weight;
    }
    if (row.isPromo && row.promoPrice != null) {
      return '<s class="layout-muted">' + money(row.price) + '</s> ' + money(row.promoPrice);
    }
    return money(row.price);
  }

  function aosAttrsForGridIndex(index) {
    void index;
    return ' data-aos="flip-up"';
  }

  function buildRelatedSlide(row, store, slideIndex) {
    var href = 'product.html?id=' + encodeURIComponent(row.id);
    var cat = store === 'coffee' ? 'coffee' : 'equipment';
    return (
      '<div class="swiper-slide">'
      + '<article class="home-feature-card"' + aosAttrsForGridIndex(slideIndex) + '>'
      + '<a class="home-feature-card__media" href="' + href + '">'
      + '<img src="' + escapeHtml(row.imageUrl) + '" alt="" loading="lazy" width="640" height="420">'
      + '</a>'
      + '<p class="home-feature-card__eyebrow">' + relatedEyebrow(store) + '</p>'
      + '<h3 class="home-feature-card__heading"><a class="layout-link-accent" href="' + href + '">' + escapeHtml(row.name) + '</a></h3>'
      + '<footer class="home-feature-card__rail">'
      + '<span class="home-feature-card__price">' + relatedPriceMarkup(row, store) + '</span>'
      + '<button type="button" class="btn btn_primary btn_compact" data-related-add-cart data-product-category="' + cat + '" data-product-id="' + escapeHtml(row.id) + '">Add</button>'
      + '</footer>'
      + '</article>'
      + '</div>'
    );
  }

  function renderRelatedSection(rows, store) {
    if (!rows.length) {
      return '';
    }
    var slides = rows.map(function (r, idx) {
      return buildRelatedSlide(r, store, idx);
    }).join('');
    return (
      '<section class="related-products layout__section" aria-labelledby="related-products-heading">'
      + '<header class="section-heading section-heading_carousel">'
      + '<div>'
      + '<h2 id="related-products-heading" class="layout__section-title">' + escapeHtml(relatedSectionTitle(store)) + '</h2>'
      + '<p class="layout-muted">More products from this catalogue.</p>'
      + '</div>'
      + '<div class="swiper-feature-nav-row" aria-hidden="true">'
      + '<button type="button" class="swiper-nav-pill swiper-nav-pill_prev related-products-prev" aria-label="Previous related products"></button>'
      + '<button type="button" class="swiper-nav-pill swiper-nav-pill_next related-products-next" aria-label="Next related products"></button>'
      + '</div>'
      + '</header>'
      + '<div class="swiper related-products-swiper catalog-carousel">'
      + '<div class="swiper-wrapper">' + slides + '</div>'
      + '<div class="swiper-pagination related-products-pagination"></div>'
      + '</div>'
      + '</section>'
    );
  }

  function destroyRelatedSwiper() {
    if (window.__bbPdpRelatedSwiper && typeof window.__bbPdpRelatedSwiper.destroy === 'function') {
      try {
        window.__bbPdpRelatedSwiper.destroy(true, true);
      } catch (ignore) {}
      window.__bbPdpRelatedSwiper = null;
    }
  }

  function initRelatedSwiper(rootEl, slideCount) {
    var swiperRoot = rootEl.querySelector('.related-products-swiper');
    if (!swiperRoot || typeof window.Swiper === 'undefined') {
      return;
    }
    var paging = swiperRoot.querySelector('.related-products-pagination');
    var prev = rootEl.querySelector('.related-products-prev');
    var next = rootEl.querySelector('.related-products-next');

    destroyRelatedSwiper();

    window.__bbPdpRelatedSwiper = new Swiper(swiperRoot, {
      spaceBetween: 18,
      slidesPerView: 1,
      breakpoints: {
        640: { slidesPerView: 2, spaceBetween: 18 },
        1024: { slidesPerView: 3, spaceBetween: 20 }
      },
      pagination: paging ? { el: paging, clickable: true } : false,
      navigation: prev && next ? { prevEl: prev, nextEl: next } : {},
      loop: slideCount > 3,
      watchOverflow: true
    });
  }

  function bindRelatedCart(rootEl) {
    if (!rootEl || !window.BeanBoutiqueDB || typeof window.BeanBoutiqueDB.addProductToCart !== 'function') {
      return;
    }
    rootEl.addEventListener('click', function (evt) {
      var btn = evt.target && evt.target.closest ? evt.target.closest('[data-related-add-cart]') : null;
      if (!btn || !rootEl.contains(btn)) {
        return;
      }
      var cat = btn.getAttribute('data-product-category');
      var pid = btn.getAttribute('data-product-id');
      if (!cat || !pid) {
        return;
      }
      var label = btn.textContent;
      btn.disabled = true;
      window.BeanBoutiqueDB.addProductToCart(cat, pid).then(function () {
        btn.textContent = 'Added ✓';
        window.setTimeout(function () {
          btn.textContent = label;
          btn.disabled = false;
        }, 1100);
      }).catch(function () {
        btn.textContent = 'Import first';
        window.setTimeout(function () {
          btn.textContent = label;
          btn.disabled = false;
        }, 1400);
      });
    });
  }

  function renderCoffeeArticle(row) {
    return (
      '<article class="product-detail">'
      + '<div class="product-detail__media">'
      + '<img src="' + escapeHtml(row.imageUrl) + '" alt="" class="product-detail__img">'
      + '</div>'
      + '<div class="product-detail__body">'
      + '<p class="product-detail__sku">' + escapeHtml(row.sku) + '</p>'
      + '<h1 class="product-detail__title">' + escapeHtml(row.name) + '</h1>'
      + '<p class="product-detail__desc">' + escapeHtml(row.description) + '</p>'
      + '<ul class="product-detail__list">'
      + '<li><strong>Origin</strong> · ' + escapeHtml(row.origin) + '</li>'
      + '<li><strong>Species</strong> · ' + escapeHtml(row.specie) + '</li>'
      + '<li><strong>Profile</strong> · ' + escapeHtml(row.roastProfile) + '</li>'
      + '<li><strong>Tasting</strong> · ' + escapeHtml(row.tastingNote) + '</li>'
      + '<li><strong>Brew</strong> · ' + escapeHtml(row.brewingMethod) + '</li>'
      + '</ul>'
      + coffeePriceMarkup(row)
      + '<div class="product-detail__cta">'
      + '<button type="button" class="btn btn_primary" data-add-cart-pdp data-product-category="coffee" data-product-id="' + escapeHtml(row.id) + '">Add to basket</button>'
      + '</div>'
      + '</div></article>'
    );
  }

  function renderEquipmentArticle(row) {
    return (
      '<article class="product-detail product-detail_equipment">'
      + '<div class="product-detail__media">'
      + '<img src="' + escapeHtml(row.imageUrl) + '" alt="" class="product-detail__img">'
      + '</div>'
      + '<div class="product-detail__body">'
      + '<p class="product-detail__sku">' + escapeHtml(row.sku) + '</p>'
      + '<h1 class="product-detail__title">' + escapeHtml(row.name) + '</h1>'
      + '<p class="product-detail__desc">' + escapeHtml(row.description) + '</p>'
      + equipmentPriceMarkup(row)
      + '<div class="product-detail__cta">'
      + '<button type="button" class="btn btn_primary" data-add-cart-pdp data-product-category="equipment" data-product-id="' + escapeHtml(row.id) + '">Add to basket</button>'
      + '</div>'
      + '</div></article>'
    );
  }

  function mountProduct() {
    var root = document.querySelector('[data-product-root]');
    if (!root || !window.BeanBoutiqueDB) {
      return;
    }

    destroyRelatedSwiper();

    var store = root.getAttribute('data-product-store');
    var id = qs('id');

    if (!store || !id) {
      setBreadcrumbCurrent('Missing product reference');
      root.innerHTML = '<p class="layout-muted">Missing product reference.</p>';
      return;
    }

    if (store !== 'coffee' && store !== 'equipment') {
      setBreadcrumbCurrent('Unsupported catalogue');
      root.innerHTML = '<p class="layout-muted">Unsupported product store.</p>';
      return;
    }

    window.BeanBoutiqueDB.getRecord(store, id).then(function (row) {
      if (!row) {
        setBreadcrumbCurrent('Not in catalogue');
        root.innerHTML = '<p class="layout-muted">That catalogue row is not in IndexedDB.</p>';
        return;
      }

      setBreadcrumbCurrent(row.name || '');

      return window.BeanBoutiqueDB.getAll(store).then(function (all) {
        var related = (all || []).filter(function (r) {
          return String(r.id) !== String(row.id);
        }).sort(function (a, b) {
          return String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' });
        });

        var articleHtml = store === 'coffee' ? renderCoffeeArticle(row) : renderEquipmentArticle(row);
        var relatedHtml = renderRelatedSection(related, store);

        root.innerHTML = articleHtml + relatedHtml;

        bindPdpCart(root, store, row.id);
        bindRelatedCart(root);

        if (related.length && typeof window.Swiper !== 'undefined') {
          window.requestAnimationFrame(function () {
            initRelatedSwiper(root, related.length);
          });
        }
      }).catch(function () {
        var articleHtmlOnly = store === 'coffee' ? renderCoffeeArticle(row) : renderEquipmentArticle(row);
        root.innerHTML = articleHtmlOnly;
        bindPdpCart(root, store, row.id);
      });
    }).catch(function () {
      setBreadcrumbCurrent('Could not load');
      root.innerHTML = '<p class="layout-muted">Could not query IndexedDB.</p>';
    });
  }

  window.addEventListener('beforeunload', destroyRelatedSwiper);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountProduct);
  } else {
    mountProduct();
  }
})();
