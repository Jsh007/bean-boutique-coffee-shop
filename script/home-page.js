/*
 * Eigbe Joshua, 224473, Frontend web development
 * Hero + promo carousels, welcome-modal (first visit), seeded from IndexedDB when available.
 */

(function ($) {
  'use strict';

  if (!$) {
    return;
  }

  var STORAGE_KEY_MODAL = 'bbe_welcome_modal_ack';

  /** Split panel (right column below hero): Flickr 51990286416 — CC BY-NC 2.0 (avlxyz). */
  var HOME_SPLIT_INTRO_IMAGE =
    'https://live.staticflickr.com/65535/51990286416_dd5ceb55a9_b.jpg';

  var STATIC_HERO_FALLBACK = [
    { title: 'Neighbour roast lab', subtitle: 'Single-origin tastings every Thursday', image: 'https://live.staticflickr.com/65535/50699736957_8c39989511_b.jpg', href: 'products/coffee/coffees.html' },
    { title: 'Bench rentals', subtitle: 'Try gear before committing', image: 'https://live.staticflickr.com/1139/528578931_cdd6b11d40_b.jpg', href: 'products/equipment/equipment.html' },
    { title: 'Community tables', subtitle: 'Workshops curated with guest roasters', image: 'https://live.staticflickr.com/65535/47693230232_c0d457b7e2_b.jpg', href: 'pages/events/events.html' }
  ];

  function money(n) {
    return '£' + Number(n).toFixed(2);
  }

  function initScrollMotion() {
    if (window.BeanBoutiqueAOS && typeof window.BeanBoutiqueAOS.refresh === 'function') {
      window.BeanBoutiqueAOS.refresh();
    }
  }

  function refreshScrollMotion() {
    initScrollMotion();
  }

  function setIntroVisual(url) {
    var img = document.querySelector('[data-home-intro-visual]');
    if (!img || !url) {
      return;
    }
    img.setAttribute('src', url);
  }

  function mountHeroSlides(items) {
    var wrapper = document.querySelector('[data-home-hero-slides]');
    if (!wrapper || typeof window.Swiper === 'undefined') {
      return;
    }

    var markup = items.map(function (slide) {
      return (
        '<div class="swiper-slide">'
        + '<a class="hero-slide" href="' + slide.href + '">'
        + '<img src="' + slide.image + '" alt="" loading="lazy">'
        + '<span class="hero-slide__shade"></span>'
        + '<span class="hero-slide__copy">'
        + '<strong class="hero-slide__heading">' + slide.title + '</strong>'
        + '<small class="hero-slide__sub">' + slide.subtitle + '</small>'
        + '</span></a>'
        + '</div>'
      );
    }).join('');
    wrapper.innerHTML = markup;

    if (window.__bbHeroSwiper && typeof window.__bbHeroSwiper.destroy === 'function') {
      try {
        window.__bbHeroSwiper.destroy(true, true);
      } catch (ignore) {}
      window.__bbHeroSwiper = null;
    }

    var root = wrapper.closest('.swiper');
    window.__bbHeroSwiper = new Swiper(root, {
      loop: items.length > 1,
      slidesPerView: 1,
      spaceBetween: 0,
      speed: 600,
      autoplay: items.length > 1 ? { delay: 6200 } : false,
      pagination: { el: '.home-hero-swiper-pagination', clickable: true },
      navigation: {
        nextEl: '.home-hero-swiper-next',
        prevEl: '.home-hero-swiper-prev'
      }
    });
    refreshScrollMotion();
  }

  function escapeAttr(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;');
  }

  function aosAttrsForGridIndex(index) {
    void index;
    return ' data-aos="flip-up"';
  }

  function mountFeaturedSlides(rows) {
    var wrapper = document.querySelector('[data-home-feature-slides]');
    if (!wrapper || typeof window.Swiper === 'undefined') {
      return;
    }

    wrapper.innerHTML = rows.map(function (row, idx) {
      var price = row.price != null ? money(row.price) : '—';
      var catAttr = escapeAttr(row.productCategory || 'coffee');
      var pidAttr = escapeAttr(row.productId || '');
      return (
        '<div class="swiper-slide">'
        + '<article class="home-feature-card"' + aosAttrsForGridIndex(idx) + '>'
        + '<a class="home-feature-card__media" href="' + row.href + '">'
        + '<img src="' + row.image + '" loading="lazy" alt="">'
        + '</a>'
        + '<p class="home-feature-card__eyebrow">' + row.category + '</p>'
        + '<h3 class="home-feature-card__heading"><a class="layout-link-accent" href="' + row.href + '">' + row.title + '</a></h3>'
        + '<footer class="home-feature-card__rail">'
        + '<span class="home-feature-card__price">' + price + '</span>'
        + '<div class="home-feature-card__actions">'
        + '<button type="button" class="btn btn_primary btn_compact" data-feature-add-cart data-product-category="' + catAttr + '" data-product-id="' + pidAttr + '">Add</button>'
        + '</div>'
        + '</footer>'
        + '</article>'
        + '</div>'
      );
    }).join('');

    if (window.__bbFeatureSwiper && typeof window.__bbFeatureSwiper.destroy === 'function') {
      try {
        window.__bbFeatureSwiper.destroy(true, true);
      } catch (ignore2) {}
      window.__bbFeatureSwiper = null;
    }

    var root = wrapper.closest('.swiper');
    window.__bbFeatureSwiper = new Swiper(root, {
      spaceBetween: 18,
      slidesPerView: 1,
      breakpoints: {
        640: { slidesPerView: 2, spaceBetween: 18 },
        1024: { slidesPerView: 3, spaceBetween: 20 }
      },
      pagination: { el: '.home-feature-swiper-pagination', clickable: true },
      navigation: {
        nextEl: '.home-feature-swiper-next',
        prevEl: '.home-feature-swiper-prev'
      }
    });
    refreshScrollMotion();
  }

  function bindFeaturedCart() {
    document.addEventListener('click', function (event) {
      var btn = event.target && event.target.closest ? event.target.closest('[data-feature-add-cart]') : null;
      if (!btn || !window.BeanBoutiqueDB) {
        return;
      }
      var cat = btn.getAttribute('data-product-category');
      var pid = btn.getAttribute('data-product-id');
      if (!cat || !pid) {
        return;
      }
      event.preventDefault();
      window.BeanBoutiqueDB.addProductToCart(cat, pid).then(function () {
        btn.textContent = 'Added';
        btn.setAttribute('disabled', 'disabled');
      }).catch(function () {
        btn.textContent = 'Retry';
      });
    });
  }

  function buildHeroFromCoffee(rows) {
    return rows.slice(0, 4).map(function (row) {
      return {
        title: row.name,
        subtitle: row.origin + ' · ' + row.tastingNote,
        image: row.imageUrl,
        href: 'products/coffee/items/product.html?id=' + encodeURIComponent(row.id)
      };
    });
  }

  function hydrate() {
    if (!window.BeanBoutiqueDB) {
      mountHeroSlides(STATIC_HERO_FALLBACK);
      setIntroVisual(HOME_SPLIT_INTRO_IMAGE);
      mountFeaturedSlides(STATIC_HERO_FALLBACK.map(function (slide, idx) {
        var isEquip = slide.href.indexOf('equipment') >= 0;
        return {
          title: slide.title,
          category: idx % 2 ? 'Coffee' : 'Gear',
          image: slide.image,
          href: slide.href,
          price: idx === 0 ? 24.9 : idx === 1 ? 148 : 12,
          productCategory: isEquip ? 'equipment' : 'coffee',
          productId: isEquip ? 'equipment-01' : 'coffee-01'
        };
      }));
      return;
    }

    window.BeanBoutiqueDB.getAll('coffee').then(function (coffees) {
      coffees.sort(function (a, b) {
        return String(a.name).localeCompare(String(b.name));
      });

      mountHeroSlides(coffees.length ? buildHeroFromCoffee(coffees) : STATIC_HERO_FALLBACK);

      return Promise.all([
        coffees,
        window.BeanBoutiqueDB.getAll('equipment')
      ]);
    }).then(function (tuple) {
      if (!tuple) {
        return;
      }
      var coffees = tuple[0] || [];
      var equipments = tuple[1] || [];
      coffees.sort(function (a, b) {
        return String(a.name).localeCompare(String(b.name));
      });
      equipments.sort(function (a, b) {
        return String(a.name).localeCompare(String(b.name));
      });

      setIntroVisual(HOME_SPLIT_INTRO_IMAGE);

      var combined = coffees.slice(0, 4).map(function (item) {
        var unit = item.isPromo && item.promoPrice != null ? item.promoPrice : item.price;
        return {
          title: item.name,
          category: 'Coffee beans',
          image: item.imageUrl,
          href: 'products/coffee/items/product.html?id=' + encodeURIComponent(item.id),
          price: unit,
          productCategory: 'coffee',
          productId: item.id
        };
      }).concat(equipments.slice(0, 4).map(function (item) {
        var unit = item.isPromo && item.promoPrice != null ? item.promoPrice : item.price;
        return {
          title: item.name,
          category: 'Gear',
          image: item.imageUrl,
          href: 'products/equipment/items/product.html?id=' + encodeURIComponent(item.id),
          price: unit,
          productCategory: 'equipment',
          productId: item.id
        };
      }));

      if (!combined.length) {
      combined = STATIC_HERO_FALLBACK.map(function (slide, idx) {
        var isEquip = slide.href.indexOf('equipment') >= 0;
        return {
          title: slide.title,
          category: idx % 2 ? 'Coffee' : 'Gear',
          image: slide.image,
          href: slide.href,
          price: 18 + idx,
          productCategory: isEquip ? 'equipment' : 'coffee',
          productId: isEquip ? 'equipment-01' : 'coffee-01'
        };
      });
      }

      mountFeaturedSlides(combined);
    }).catch(function () {
      mountHeroSlides(STATIC_HERO_FALLBACK);
      mountFeaturedSlides(STATIC_HERO_FALLBACK.map(function (slide, idx) {
        return {
          title: slide.title,
          category: idx % 2 === 0 ? 'Coffee' : 'Gear',
          image: slide.image,
          href: slide.href,
          price: 20,
          productCategory: 'coffee',
          productId: 'coffee-01'
        };
      }));
      setIntroVisual(HOME_SPLIT_INTRO_IMAGE);
    });
  }

  function mountWelcomeModal() {
    try {
      if (!$('#welcome-modal').length) {
        return;
      }
      if (window.sessionStorage && window.sessionStorage.getItem(STORAGE_KEY_MODAL) === '1') {
        return;
      }

      $('#welcome-modal').removeAttr('hidden').addClass('welcome-modal_visible');

      $('#welcome-modal-dismiss').on('click', closeWelcome);
      $('#welcome-modal').find('[data-role="welcome-backdrop"]').on('click', closeWelcome);

      $(document).on('keydown.bbWelcomeModal', function (ev) {
        if (ev.key === 'Escape') {
          closeWelcome();
        }
      });

      function closeWelcome() {
        $(document).off('keydown.bbWelcomeModal');
        $('#welcome-modal').attr('hidden', 'hidden').removeClass('welcome-modal_visible');
        try {
          window.sessionStorage.setItem(STORAGE_KEY_MODAL, '1');
        } catch (ignore3) {}
      }

      $('#welcome-modal-form').on('submit', function (event) {
        event.preventDefault();
        $(document).off('keydown.bbWelcomeModal');
        var addr = (($('#welcome-email').val() || '').trim());
        try {
          window.sessionStorage.setItem(STORAGE_KEY_MODAL, '1');
        } catch (ignore2) {}

        $('#welcome-modal').attr('hidden', 'hidden').removeClass('welcome-modal_visible');

        if (window.location.href.indexOf('mailto:') !== 0) {
          window.location.href = 'mailto:welcome-offer@beanboutique.demo'
            + '?subject=' + encodeURIComponent('Bean Boutique welcome perk')
            + '&body=' + encodeURIComponent(
              'Please add this email for the first-purchase perk list: '
              + (addr || 'not-provided-demo')
              + ''
            );
        }
      });
    } catch (err) {}
  }

  function bindNewsletter() {
    var form = document.getElementById('home-newsletter-form');
    if (!form) {
      return;
    }
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var nm = document.getElementById('newsletter-name');
      var em = document.getElementById('newsletter-email');
      var namePart = nm && nm.value ? String(nm.value).trim() : 'Guest reader';
      var emailPart = em && em.value ? String(em.value).trim() : 'not-provided';
      window.location.href = 'mailto:newsletter@beanboutique.demo'
        + '?subject=' + encodeURIComponent('Newsletter signup')
        + '&body=' + encodeURIComponent(namePart + ' · ' + emailPart);
    });
  }

  function flushFacebookXFBML() {
    if (typeof window.FB === 'undefined' || !window.FB.XFBML || typeof window.FB.XFBML.parse !== 'function') {
      return;
    }
    try {
      var root = document.querySelector('.embed-community');
      window.FB.XFBML.parse(root || document.body);
    } catch (ignore) {}
  }

  $(function () {
    initScrollMotion();
    hydrate();
    mountWelcomeModal();
    bindFeaturedCart();
    bindNewsletter();
    flushFacebookXFBML();
    window.addEventListener('load', flushFacebookXFBML);
    setTimeout(flushFacebookXFBML, 400);
    setTimeout(flushFacebookXFBML, 1400);
  });
})(window.jQuery);
