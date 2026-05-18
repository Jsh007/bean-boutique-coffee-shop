/*
 * Eigbe Joshua, 224473, Frontend web development
 */

(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  ready(function () {
    var toggle = document.querySelector('[data-nav-toggle]');
    var panel = document.getElementById('site-nav-panel');
    if (!toggle || !panel) {
      return;
    }

    function setOpen(isOpen) {
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      panel.classList.toggle('site-nav_panel_open', isOpen);
      panel.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
    }

    setOpen(false);

    toggle.addEventListener('click', function () {
      var openNow = toggle.getAttribute('aria-expanded') === 'true';
      setOpen(!openNow);
    });

    panel.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function (evt) {
        if (!window.matchMedia('(max-width: 859px)').matches) {
          return;
        }
        if (evt.metaKey || evt.ctrlKey || evt.shiftKey || evt.altKey) {
          setOpen(false);
          return;
        }
        if (link.getAttribute('target') === '_blank') {
          setOpen(false);
          return;
        }
        try {
          var u = new URL(link.href, window.location.href);
          var cur = window.location;
          var sameDoc =
            u.origin === cur.origin
            && u.pathname === cur.pathname
            && u.search === cur.search;
          /* Full page change: leave drawer “open” until unload so `.site-brand__name` stays hidden — avoids a one-frame logo flash after we remove `site-nav_panel_open`. */
          if (sameDoc) {
            setOpen(false);
          }
        } catch (_err) {
          setOpen(false);
        }
      });
    });

    document.querySelectorAll('.site-header__actions a').forEach(function (link) {
      link.addEventListener('click', function () {
        if (window.matchMedia('(max-width: 859px)').matches) {
          setOpen(false);
        }
      });
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
      }
    });
  });
})();
