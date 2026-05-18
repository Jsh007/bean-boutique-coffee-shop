/*
 * Eigbe Joshua, 224473, Frontend web development
 * Events list plus jQuery-managed registration modal (IndexedDB attendee store; no mailto hand-off).
 */

(function ($) {
  'use strict';

  if (!$) {
    return;
  }

  var PROFILE_KEY = 'bbe_demo_profile_id';

  function escape(raw) {
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

  function aosAttrsForGridIndex(index) {
    void index;
    return ' data-aos="flip-up"';
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
      if (fields.first.length) fields.first.val(row.firstName || '');
      if (fields.last.length) fields.last.val(row.lastName || '');
      if (fields.email.length) fields.email.val(row.emailAddress || '');
    }).catch(function () {});
  }

  $(function boot() {
    var list = $('[data-events-list]');
    var slot = $('[data-events-status]');
    var moreBtn = $('[data-events-more]');
    var pageSize = 6;
    var modal = $('#event-register-modal');
    var fields = {
      first: $('#register-first-name'),
      last: $('#register-last-name'),
      email: $('#register-email')
    };

    function openModal(eventId) {
      modal.attr('data-active-event-id', eventId);
      hydrateProfile(fields);
      modal.removeAttr('hidden').addClass('event-modal_visible');
      fields.first.trigger('focus');
      $('body').attr('data-modal-open', 'true');
    }

    function closeModal() {
      modal.attr('hidden', 'hidden').removeClass('event-modal_visible').removeAttr('data-active-event-id');
      $('body').removeAttr('data-modal-open');
      var formEl = document.getElementById('event-register-form');
      if (formEl) {
        formEl.reset();
      }
    }

    modal.on('click', '[data-close-event-modal]', function () {
      closeModal();
    });

    $('#event-register-form').on('submit', function (evt) {
      evt.preventDefault();
      var payload = {
        firstName: ($.trim(fields.first.val()) || ''),
        lastName: ($.trim(fields.last.val()) || ''),
        email: ($.trim(fields.email.val()) || ''),
        eventId: modal.attr('data-active-event-id')
      };

      if (!payload.firstName || !payload.lastName || !payload.email || !payload.eventId) {
        return;
      }

      window.BeanBoutiqueDB.addAttendeeRecord({
        eventId: payload.eventId,
        firstName: payload.firstName,
        lastName: payload.lastName,
        email: payload.email,
        userId: window.localStorage && window.localStorage.getItem(PROFILE_KEY)
      }).then(function () {
        closeModal();
        slot.text('Saved to IndexedDB attendee store. Open the event page to review the list.');
      }).catch(function () {
        slot.text('Could not persist attendee locally.');
      });
    });

    list.on('click', '[data-open-register]', function () {
      openModal($(this).attr('data-open-register'));
    });

    if (!list.length || !window.BeanBoutiqueDB) {
      slot.text('Missing IndexedDB bindings.');
      return;
    }

    window.BeanBoutiqueDB.getAll('event').then(function (rows) {
      rows.sort(function (a, b) {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });

      if (!rows.length) {
        list.empty();
        slot.text('No workshops seeded—visit Setup importer.');
        if (moreBtn.length) moreBtn.prop('hidden', true);
        return;
      }

      slot.text('');

      var visible = pageSize;

      function renderEvents() {
        var slice = rows.slice(0, visible);
        list.html(slice.map(function (evt, idx) {
          var fig = evt.imageUrl
            ? (
              '<figure class="event-card__figure">'
              + '<img class="event-card__img" src="' + escape(evt.imageUrl) + '" alt="" loading="lazy" decoding="async">'
              + '</figure>'
            )
            : '';
          return (
            '<article class="event-card" id="' + escape(evt.id) + '"' + aosAttrsForGridIndex(idx) + '>'
            + fig
            + '<p class="event-card__when">' + escape(fmtDate(evt.date)) + '</p>'
            + '<h2 class="event-card__title">' + escape(evt.name) + '</h2>'
            + '<p class="event-card__venue">' + escape(evt.venue) + '</p>'
            + '<p class="event-card__summary">' + escape(evt.description) + '</p>'
            + '<p class="event-card__actions">'
            + '<a class="btn btn_ghost btn_compact" href="items/event.html?id=' + encodeURIComponent(evt.id) + '">View event</a> '
            + '<button type="button" class="btn btn_primary btn_compact" data-open-register="' + escape(evt.id) + '">Reserve a seat</button>'
            + '</p>'
            + '</article>'
          );
        }).join(''));
        if (moreBtn.length) moreBtn.prop('hidden', visible >= rows.length);
      }

      renderEvents();

      if (moreBtn.length) {
        moreBtn.on('click', function () {
          visible += pageSize;
          renderEvents();
        });
      }
    }).catch(function () {
      slot.text('Unable to hydrate events catalogue.');
    });
  });
})(window.jQuery);
