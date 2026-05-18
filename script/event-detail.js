/*
 * Eigbe Joshua, 224473, Frontend web development
 * Event PDP: detail, venue map, Reserve a seat (IndexedDB), registered attendees table.
 */

(function () {
  'use strict';

  var PROFILE_KEY = 'bbe_demo_profile_id';

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

  function fmtDate(iso) {
    try {
      return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
    } catch (err) {
      return iso;
    }
  }

  function hydrateProfile(fields) {
    var targetId = (window.localStorage && window.localStorage.getItem(PROFILE_KEY)) || 'user-01';
    if (!window.BeanBoutiqueDB) {
      return;
    }
    window.BeanBoutiqueDB.getRecord('user', targetId).then(function (row) {
      if (!row) {
        return;
      }
      if (fields.first) fields.first.value = row.firstName || '';
      if (fields.last) fields.last.value = row.lastName || '';
      if (fields.email) fields.email.value = row.emailAddress || '';
    }).catch(function () {});
  }

  function embedUrlForVenue(venue) {
    var v = String(venue || '');
    if (v.indexOf('Manchester') !== -1) {
      return 'https://www.openstreetmap.org/export/embed.html?bbox=-2.35%2C53.44%2C-2.15%2C53.52&layer=mapnik';
    }
    if (v.indexOf('London') !== -1) {
      return 'https://www.openstreetmap.org/export/embed.html?bbox=-0.20%2C51.47%2C-0.03%2C51.54&layer=mapnik';
    }
    if (v.indexOf('Leeds') !== -1) {
      return 'https://www.openstreetmap.org/export/embed.html?bbox=-1.62%2C53.76%2C-1.48%2C53.82&layer=mapnik';
    }
    if (v.indexOf('Glasgow') !== -1) {
      return 'https://www.openstreetmap.org/export/embed.html?bbox=-4.30%2C55.84%2C-4.22%2C55.90&layer=mapnik';
    }
    return 'https://www.openstreetmap.org/export/embed.html?bbox=-2.35%2C53.44%2C-2.15%2C53.52&layer=mapnik';
  }

  function setBreadcrumbCurrent(text) {
    var el = document.querySelector('[data-breadcrumb-root] [data-breadcrumb-current]');
    if (el) el.textContent = text || '';
  }

  function attendeeRowsHtml(forEvent) {
    if (!forEvent.length) {
      return '<tr><td colspan="2" class="layout-muted">No RSVPs stored for this workshop yet.</td></tr>';
    }
    return forEvent.map(function (a) {
      return (
        '<tr>'
        + '<td>' + escapeHtml(a.firstName) + ' ' + escapeHtml(a.lastName) + '</td>'
        + '<td>' + escapeHtml(a.email) + '</td>'
        + '</tr>'
      );
    }).join('');
  }

  function mount() {
    var root = document.querySelector('[data-event-detail-root]');
    var status = document.querySelector('[data-event-status]');
    if (!root || !window.BeanBoutiqueDB) {
      if (status) status.textContent = 'IndexedDB helper missing.';
      return;
    }

    var id = qs('id');
    if (!id) {
      setBreadcrumbCurrent('Missing event id');
      root.innerHTML = '<p class="layout-muted">Missing event id.</p>';
      return;
    }

    Promise.all([
      window.BeanBoutiqueDB.getRecord('event', id),
      window.BeanBoutiqueDB.getAll('attendee')
    ]).then(function (tuple) {
      var evt = tuple[0];
      var attendees = tuple[1] || [];

      if (!evt) {
        setBreadcrumbCurrent('Event not found');
        root.innerHTML = '<p class="layout-muted">Event not found.</p>';
        return;
      }

      setBreadcrumbCurrent(evt.name || '');

      var forEvent = attendees.filter(function (a) {
        return String(a.eventId) === String(evt.id);
      });

      var heroBlock = evt.imageUrl
        ? (
          '<figure class="event-detail-card__figure">'
          + '<img class="event-detail-card__hero-img" src="' + escapeHtml(evt.imageUrl) + '" alt="" loading="lazy" decoding="async">'
          + '</figure>'
        )
        : '<div class="event-detail-card__media-placeholder" aria-hidden="true"></div>';

      root.innerHTML = (
        '<article class="event-detail-card">'
        + '<div class="event-detail-card__media-col">' + heroBlock + '</div>'
        + '<div class="event-detail-card__content-col">'
        + '<header class="event-detail-card__header">'
        + '<p class="event-card__when">' + escapeHtml(fmtDate(evt.date)) + '</p>'
        + '<h1 class="event-detail-card__title">' + escapeHtml(evt.name) + '</h1>'
        + '<p class="event-card__venue">' + escapeHtml(evt.venue) + '</p>'
        + '</header>'
        + '<p class="event-detail-card__body">' + escapeHtml(evt.description) + '</p>'
        + '<section class="event-detail-card__map" aria-labelledby="event-map-heading">'
        + '<h2 id="event-map-heading" class="home-tile__title">Venue map</h2>'
        + '<div class="map-frame"><iframe title="OpenStreetMap preview for ' + escapeHtml(evt.venue) + '" loading="lazy" src="' + embedUrlForVenue(evt.venue) + '"></iframe></div>'
        + '<p class="layout-muted">Static map bbox matched to the city named in the venue string (coursework embed).</p>'
        + '</section>'
        + '<section class="event-detail-card__rsvp" aria-labelledby="event-rsvp-heading">'
        + '<h2 id="event-rsvp-heading" class="home-tile__title">Reserve a seat</h2>'
        + '<p class="layout-muted">Saves to the local attendee store (same as the list modal)—no mail client.</p>'
        + '<form id="event-pdp-rsvp-form" class="event-modal__form" novalidate>'
        + '<label class="welcome-field">'
        + '<span>First name</span>'
        + '<input type="text" id="pdp-rsvp-first" name="firstName" autocomplete="given-name" class="catalog-search" required>'
        + '</label>'
        + '<label class="welcome-field">'
        + '<span>Last name</span>'
        + '<input type="text" id="pdp-rsvp-last" name="lastName" autocomplete="family-name" class="catalog-search" required>'
        + '</label>'
        + '<label class="welcome-field">'
        + '<span>Email</span>'
        + '<input type="email" id="pdp-rsvp-email" name="email" autocomplete="email" class="catalog-search" required>'
        + '</label>'
        + '<div class="event-detail-card__rsvp-actions">'
        + '<button type="submit" class="btn btn_primary btn_compact">Save RSVP</button>'
        + '</div>'
        + '</form>'
        + '</section>'
        + '<section class="event-detail-card__attendees" aria-labelledby="event-att-heading">'
        + '<h2 id="event-att-heading" class="home-tile__title">Registered attendees</h2>'
        + '<div class="event-attendee-table-wrap">'
        + '<table class="cart-table event-attendee-table">'
        + '<thead><tr><th scope="col">Name</th><th scope="col">Email</th></tr></thead>'
        + '<tbody data-event-attendee-rows>' + attendeeRowsHtml(forEvent) + '</tbody>'
        + '</table></div>'
        + '</section>'
        + '</div>'
        + '</article>'
      );

      var fields = {
        first: document.getElementById('pdp-rsvp-first'),
        last: document.getElementById('pdp-rsvp-last'),
        email: document.getElementById('pdp-rsvp-email')
      };
      hydrateProfile(fields);

      var form = document.getElementById('event-pdp-rsvp-form');
      var tbody = root.querySelector('[data-event-attendee-rows]');

      if (form && tbody) {
        form.addEventListener('submit', function (subEvt) {
          subEvt.preventDefault();
          var firstName = (fields.first && String(fields.first.value || '').trim()) || '';
          var lastName = (fields.last && String(fields.last.value || '').trim()) || '';
          var email = (fields.email && String(fields.email.value || '').trim()) || '';
          if (!firstName || !lastName || !email) {
            if (status) status.textContent = 'Please complete all fields.';
            return;
          }

          window.BeanBoutiqueDB.addAttendeeRecord({
            eventId: evt.id,
            firstName: firstName,
            lastName: lastName,
            email: email,
            userId: window.localStorage && window.localStorage.getItem(PROFILE_KEY)
          }).then(function () {
            if (status) status.textContent = 'Saved to IndexedDB.';
            form.reset();
            hydrateProfile(fields);
            return window.BeanBoutiqueDB.getAll('attendee');
          }).then(function (all) {
            if (!tbody) return;
            var next = (all || []).filter(function (a) {
              return String(a.eventId) === String(evt.id);
            });
            tbody.innerHTML = attendeeRowsHtml(next);
          }).catch(function () {
            if (status) status.textContent = 'Could not save RSVP locally.';
          });
        });
      }

      if (status) status.textContent = '';
    }).catch(function () {
      setBreadcrumbCurrent('Unable to load');
      root.innerHTML = '<p class="layout-muted">Unable to load event.</p>';
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
