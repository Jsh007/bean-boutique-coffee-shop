/*
 * Eigbe Joshua, 224473, Frontend web development
 * Coffee & equipment catalogues: IndexedDB read, search, price range, load more, Swiper (coffee only).
 */

(function () {
  'use strict';

  function $(selector) {
    return document.querySelector(selector);
  }

  function escapeHtml(raw) {
    return String(raw)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatMoney(value) {
    return '£' + Number(value).toFixed(2);
  }

  function coffeeShelfPrice(row) {
    if (row.isPromo && row.promoPrice != null) {
      return Number(row.promoPrice);
    }
    return Number(row.price);
  }

  function gearShelfPrice(row) {
    if (row.isPromo && row.promoPrice != null) {
      return Number(row.promoPrice);
    }
    return Number(row.price);
  }

  function debounce(fn, wait) {
    var handle;
    return function () {
      var ctx = this;
      var args = arguments;
      window.clearTimeout(handle);
      handle = window.setTimeout(function () {
        fn.apply(ctx, args);
      }, wait);
    };
  }

  function sortName(a, b) {
    return String(a.name).localeCompare(String(b.name));
  }

  function serializeCoffee(row) {
    return [row.name, row.sku, row.origin, row.tastingNote, row.type, row.specie, row.description]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
  }

  function serializeGear(row) {
    return [row.name, row.sku, row.description]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
  }

  function aosAttrsForGridIndex(index) {
    void index;
    return ' data-aos="flip-up"';
  }

  function buildCoffeeCard(row, searchQuery, cardIndex) {
    var price = coffeeShelfPrice(row);
    var slugUrl = 'items/product.html?id=' + encodeURIComponent(row.id);
    var q = searchQuery.trim().toLowerCase();
    var hit = !q || serializeCoffee(row).indexOf(q) !== -1;
    var hitClass = q ? (hit ? ' catalog-card_match' : ' catalog-card_dim') : '';
    var promo = row.isPromo ? '<span class="catalog-card__ribbon">Promo</span>' : '';
    return (
      '<article class="catalog-card catalog-card_type_coffee' + hitClass + '" data-card-id="' + escapeHtml(row.id) + '"' + aosAttrsForGridIndex(cardIndex) + '>'
      + '<a class="catalog-card__media" href="' + slugUrl + '">'
      + '<img class="catalog-card__img" src="' + escapeHtml(row.imageUrl) + '" width="640" height="420" loading="lazy" alt="">'
      + promo
      + '</a>'
      + '<div class="catalog-card__body">'
      + '<p class="catalog-card__sku">' + escapeHtml(row.sku) + '</p>'
      + '<h2 class="catalog-card__title"><a class="catalog-card__title-link" href="' + slugUrl + '">' + escapeHtml(row.name) + '</a></h2>'
      + '<p class="catalog-card__excerpt">' + escapeHtml(row.description) + '</p>'
      + '<dl class="catalog-card__facts">'
      + '<div><dt>Origin</dt><dd>' + escapeHtml(row.origin) + '</dd></div>'
      + '<div><dt>Roast</dt><dd>' + escapeHtml(row.roastProfile) + '</dd></div>'
      + '<div><dt>Note</dt><dd>' + escapeHtml(row.tastingNote) + '</dd></div>'
      + '</dl>'
      + '<p class="catalog-card__price">' + formatMoney(price) + ' <span class="catalog-card__uom">' + escapeHtml(row.weight || '1kg') + '</span></p>'
      + '<div class="catalog-card__cta">'
      + '<button type="button" class="btn btn_primary btn_compact" data-add-cart data-product-category="coffee" data-product-id="' + escapeHtml(row.id) + '">Add to cart</button>'
      + '</div>'
      + '</div></article>'
    );
  }

  function buildGearCard(row, searchQuery, cardIndex) {
    var price = gearShelfPrice(row);
    var slugUrl = 'items/product.html?id=' + encodeURIComponent(row.id);
    var q = searchQuery.trim().toLowerCase();
    var hit = !q || serializeGear(row).indexOf(q) !== -1;
    var hitClass = q ? (hit ? ' catalog-card_match' : ' catalog-card_dim') : '';
    var promo = row.isPromo ? '<span class="catalog-card__ribbon">Promo</span>' : '';
    return (
      '<article class="catalog-card catalog-card_type_equipment' + hitClass + '"' + aosAttrsForGridIndex(cardIndex) + '>'
      + '<a class="catalog-card__media" href="' + slugUrl + '">'
      + '<img class="catalog-card__img" src="' + escapeHtml(row.imageUrl) + '" width="640" height="420" loading="lazy" alt="">'
      + promo
      + '</a>'
      + '<div class="catalog-card__body">'
      + '<p class="catalog-card__sku">' + escapeHtml(row.sku) + '</p>'
      + '<h2 class="catalog-card__title"><a class="catalog-card__title-link" href="' + slugUrl + '">' + escapeHtml(row.name) + '</a></h2>'
      + '<p class="catalog-card__excerpt">' + escapeHtml(row.description) + '</p>'
      + '<p class="catalog-card__price">' + formatMoney(price) + '</p>'
      + '<div class="catalog-card__cta">'
      + '<button type="button" class="btn btn_primary btn_compact" data-add-cart data-product-category="equipment" data-product-id="' + escapeHtml(row.id) + '">Add to cart</button>'
      + '</div>'
      + '</div></article>'
    );
  }

  function mountCatalog() {
    var body = document.body;
    var storeName = body.getAttribute('data-catalog-store');
    if (!storeName) {
      return;
    }

    var grid = $('[data-catalog-grid]');
    var statusSlot = $('[data-catalog-status]');
    var searchInput = document.querySelector('[data-catalog-search]');
    var loadBtn = document.querySelector('[data-catalog-more]');
    var pageSize = Number(body.getAttribute('data-catalog-page-size') || '6');
    var priceRoot = document.querySelector('[data-price-slider]');
    var carouselEl = document.querySelector('[data-carousel-root]');

    if (!grid || !window.BeanBoutiqueDB) {
      if (statusSlot) {
        statusSlot.textContent = 'Database helper missing.';
      }
      return;
    }

    var swiperInstance;

    grid.addEventListener('click', function (evt) {
      var trigger = evt.target.closest('[data-add-cart]');
      if (!trigger) {
        return;
      }
      evt.preventDefault();
      var cat = trigger.getAttribute('data-product-category');
      var pid = trigger.getAttribute('data-product-id');
      if (!window.BeanBoutiqueDB || typeof window.BeanBoutiqueDB.addProductToCart !== 'function') {
        return;
      }
      trigger.disabled = true;
      window.BeanBoutiqueDB.addProductToCart(cat, pid).then(function () {
        var previous = trigger.textContent;
        trigger.textContent = 'Added ✓';
        window.setTimeout(function () {
          trigger.textContent = previous;
          trigger.disabled = false;
        }, 1000);
      }).catch(function () {
        trigger.textContent = 'Setup data first';
        window.setTimeout(function () {
          trigger.textContent = 'Add to cart';
          trigger.disabled = false;
        }, 1400);
      });
    });

    window.BeanBoutiqueDB.getAll(storeName).then(function (rows) {
      rows.sort(sortName);
      var state = {
        query: '',
        minPrice: null,
        maxPrice: null,
        visible: pageSize,
        sliderReady: false
      };

      if (!rows.length) {
        grid.innerHTML = '';
        statusSlot.textContent = 'No rows yet—open Setup and import demo data.';
        if (loadBtn) loadBtn.hidden = true;
        return;
      }

      statusSlot.textContent = '';

      function derivePrice(row) {
        return storeName === 'coffee' ? coffeeShelfPrice(row) : gearShelfPrice(row);
      }

      function filterRows() {
        return rows.filter(function (row) {
          var haystack = storeName === 'coffee' ? serializeCoffee(row) : serializeGear(row);
          var q = state.query.trim().toLowerCase();
          if (q && haystack.indexOf(q) === -1) {
            return false;
          }
          if (state.sliderReady && state.minPrice != null && state.maxPrice != null) {
            var shelf = derivePrice(row);
            if (shelf < state.minPrice || shelf > state.maxPrice) {
              return false;
            }
          }
          return true;
        });
      }

      function render() {
        var filtered = filterRows();
        if (!filtered.length) {
          grid.innerHTML = '<p class="catalog-empty">No matches for this filter.</p>';
          if (loadBtn) loadBtn.hidden = true;
          return;
        }

        state.visible = Math.min(Math.max(state.visible, pageSize), filtered.length);

        var slice = filtered.slice(0, state.visible);
        grid.innerHTML = slice.map(function (row, idx) {
          return storeName === 'coffee' ? buildCoffeeCard(row, state.query, idx) : buildGearCard(row, state.query, idx);
        }).join('');

        if (loadBtn) {
          loadBtn.hidden = state.visible >= filtered.length;
        }
      }

      function resetPaging() {
        state.visible = pageSize;
      }

      if (carouselEl && storeName === 'coffee' && window.Swiper) {
        var carouselWrapParent = carouselEl.closest('.swiper');
        var carouselMarkup = rows.slice(0, 6).map(function (row) {
          var slug = 'items/product.html?id=' + encodeURIComponent(row.id);
          return (
            '<div class="swiper-slide">'
            + '<a class="feature-slide" href="' + slug + '">'
            + '<img src="' + escapeHtml(row.imageUrl) + '" alt="" loading="lazy">'
            + '<span class="feature-slide__label">' + escapeHtml(row.name) + '</span>'
            + '</a></div>'
          );
        }).join('');
        carouselEl.innerHTML = carouselMarkup;

        var paging = carouselWrapParent ? carouselWrapParent.querySelector('.swiper-pagination') : null;

        swiperInstance = new Swiper(carouselWrapParent || carouselEl.parentElement, {
          spaceBetween: 16,
          slidesPerView: 1,
          breakpoints: {
            640: { slidesPerView: 2, spaceBetween: 16 },
            900: { slidesPerView: 3, spaceBetween: 18 }
          },
          pagination: paging ? { el: paging, clickable: true } : false,
          navigation: storeName === 'coffee' ? {
            nextEl: '.coffee-carousel-next',
            prevEl: '.coffee-carousel-prev'
          } : false,
          loop: rows.length > 3
        });
      }

      if (priceRoot && window.noUiSlider) {
        var prices = rows.map(derivePrice);
        var minP = Math.min.apply(Math, prices);
        var maxP = Math.max.apply(Math, prices);
        state.minPrice = minP;
        state.maxPrice = maxP;
        var priceWrap = priceRoot.closest('.catalog-price');
        var priceReadout = priceWrap ? priceWrap.querySelector('[data-catalog-price-readout]') : null;

        function syncPriceReadout() {
          if (!priceReadout || !priceRoot.noUiSlider) {
            return;
          }
          var vals = priceRoot.noUiSlider.get();
          priceReadout.textContent = formatMoney(Number(vals[0])) + ' – ' + formatMoney(Number(vals[1]));
        }

        window.noUiSlider.create(priceRoot, {
          start: [minP, maxP],
          connect: true,
          range: { min: minP, max: maxP },
          step: maxP - minP >= 50 ? 1 : 0.05
        });
        syncPriceReadout();
        priceRoot.noUiSlider.on('update', syncPriceReadout);
        priceRoot.noUiSlider.on('update', debounce(function () {
          var vals = priceRoot.noUiSlider.get();
          state.minPrice = Number(vals[0]);
          state.maxPrice = Number(vals[1]);
          state.sliderReady = true;
          resetPaging();
          render();
        }, 120));
        state.sliderReady = true;
      }

      render();

      if (searchInput) {
        searchInput.addEventListener('input', debounce(function () {
          state.query = searchInput.value || '';
          resetPaging();
          render();
          searchInput.classList.toggle('catalog-search_pulse', !!state.query.trim());
        }, 160));
      }

      if (loadBtn) {
        loadBtn.addEventListener('click', function () {
          state.visible += pageSize;
          render();
        });
      }

      window.addEventListener('beforeunload', function () {
        if (swiperInstance && swiperInstance.destroy) {
          swiperInstance.destroy(true, true);
        }
      });
    }).catch(function () {
      if (statusSlot) {
        statusSlot.textContent = 'Unable to open IndexedDB. Run setup importer first.';
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountCatalog);
  } else {
    mountCatalog();
  }
})();
