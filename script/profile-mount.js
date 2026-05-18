/*
 * Eigbe Joshua, 224473, Frontend web development
 * Profile dashboard aligned to coursework sketch (breadcrumb, hero, purchase history,
 * subscriptions, events). Hydrates from IndexedDB user / cart / subscription / attendee / event.
 */

(function () {
  "use strict";

  var PAGE_HISTORY = 4;
  var PAGE_SUBS = 2;
  var PAGE_EVENTS = 3;

  function escapeHtml(raw) {
    return String(raw)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function money(n) {
    return "£" + Number(n).toFixed(2);
  }

  /** ISO → YYYY-MM-DD */
  function formatIsoDateYYYYMMDD(value) {
    if (value == null || value === "") {
      return "—";
    }
    var s = String(value).trim();
    if (!s) {
      return "—";
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
      y + "-" + (m < 10 ? "0" : "") + m + "-" + (day < 10 ? "0" : "") + day,
    );
  }

  function attendeeMatchesProfile(att, userRow) {
    if (!userRow || !att) {
      return false;
    }
    if (att.userId && att.userId === userRow.id) {
      return true;
    }
    var ae = String(att.email || "")
      .trim()
      .toLowerCase();
    var ue = String(userRow.emailAddress || "")
      .trim()
      .toLowerCase();
    return ae !== "" && ue !== "" && ae === ue;
  }

  function attachPagedSection(
    root,
    btnSel,
    listSel,
    rows,
    pageSize,
    renderItem,
    emptyHtml,
  ) {
    var btn = root.querySelector(btnSel);
    var listEl = root.querySelector(listSel);
    var visible = Math.min(pageSize, rows.length);
    var emptyMarkup =
      emptyHtml ||
      '<p class="profile-stack__empty layout-muted">Nothing here yet.</p>';

    function redraw() {
      if (!rows.length) {
        listEl.innerHTML = emptyMarkup;
        if (btn) btn.hidden = true;
        return;
      }
      listEl.innerHTML = rows.slice(0, visible).map(renderItem).join("");
      if (btn) btn.hidden = visible >= rows.length;
    }

    redraw();
    if (btn) {
      btn.addEventListener("click", function () {
        visible = Math.min(visible + pageSize, rows.length);
        redraw();
      });
    }
  }

  function mount() {
    var root = document.querySelector("[data-profile-root]");
    var statusEl = document.querySelector("[data-profile-status]");
    if (!root || !window.BeanBoutiqueDB) {
      return;
    }

    var profileId = null;
    try {
      profileId = window.localStorage.getItem("bbe_demo_profile_id");
    } catch (err) {
      /** ignore **/
    }
    if (!profileId) {
      profileId = "user-01";
    }

    window.BeanBoutiqueDB.getRecord("user", profileId)
      .then(function (userRow) {
        if (!userRow) {
          root.innerHTML = "";
          if (statusEl) {
            statusEl.textContent = "";
          }
          root.innerHTML =
            '<p class="layout-muted">No seeded profile for id <strong>' +
            escapeHtml(profileId) +
            '</strong>. Import demo data or set <code class="catalog-search">localStorage.bbe_demo_profile_id</code>.</p>';
          return null;
        }

        return Promise.all([
          Promise.resolve(userRow),
          window.BeanBoutiqueDB.getAll("cart"),
          window.BeanBoutiqueDB.getAll("subscription"),
          window.BeanBoutiqueDB.getAll("attendee"),
          window.BeanBoutiqueDB.getAll("event"),
        ]);
      })
      .then(function (bundle) {
        if (!bundle) {
          return;
        }

        var userRow = bundle[0];
        var cartLines = bundle[1] || [];
        var allSubs = bundle[2] || [];
        var attendees = bundle[3] || [];
        var events = bundle[4] || [];

        var fullName = [userRow.firstName, userRow.lastName]
          .filter(Boolean)
          .join(" ");
        var photoSrc = escapeHtml(userRow.imageUrl || "");
        var safeName = escapeHtml(fullName || "Member");

        var purchaseSorted = cartLines.slice().sort(function (a, b) {
          return (
            new Date(b.createdDate || "").getTime() -
            new Date(a.createdDate || "").getTime()
          );
        });

        var mySubs = allSubs
          .filter(function (s) {
            return s.userId === userRow.id;
          })
          .sort(function (a, b) {
            return (
              new Date(b.subscribeDate || "").getTime() -
              new Date(a.subscribeDate || "").getTime()
            );
          });

        var eventMap = {};
        events.forEach(function (ev) {
          eventMap[ev.id] = ev;
        });

        var myEvents = [];
        var seenEvent = {};
        attendees
          .filter(function (att) {
            return attendeeMatchesProfile(att, userRow);
          })
          .forEach(function (att) {
            var ev = eventMap[att.eventId];
            if (ev && !seenEvent[ev.id]) {
              seenEvent[ev.id] = true;
              myEvents.push(ev);
            }
          });
        myEvents.sort(function (a, b) {
          return (
            new Date(a.date || "").getTime() - new Date(b.date || "").getTime()
          );
        });

        root.innerHTML =
          '<section class="profile-card profile-card_hero card-surface layout__section" aria-labelledby="profile-card-title">' +
          (photoSrc
            ? '<img class="profile-card__photo" src="' +
              photoSrc +
              '" alt="' +
              safeName +
              '" loading="lazy" width="280" height="280">'
            : '<div class="profile-card__photo profile-card__photo_fallback" role="img" aria-hidden="true"></div>') +
          '<div class="profile-card__body">' +
          '<h1 class="profile-card__name" id="profile-card-title">' +
          safeName +
          "</h1>" +
          '<p class="profile-card__id layout-muted">Profile id · <code>' +
          escapeHtml(userRow.id) +
          "</code></p>" +
          '<dl class="profile-card__fields">' +
          '<dt>Email</dt><dd><a href="mailto:' +
          escapeHtml(userRow.emailAddress || "") +
          '">' +
          escapeHtml(userRow.emailAddress || "") +
          "</a></dd>" +
          "<dt>Street</dt><dd>" +
          escapeHtml(userRow.streetAddress || "") +
          "</dd>" +
          "<dt>City</dt><dd>" +
          escapeHtml(userRow.city || "") +
          "</dd>" +
          "<dt>Region</dt><dd>" +
          escapeHtml(userRow.state || "") +
          "</dd>" +
          "<dt>Postcode</dt><dd>" +
          escapeHtml(userRow.zipCode || "") +
          "</dd>" +
          "</dl>" +
          '<p class="profile-card__footer-note layout-muted"></p>' +
          "</div>" +
          "</section>" +
          '<section class="profile-stack layout__section" aria-labelledby="profile-purchase-heading">' +
          '<h2 class="profile-stack__title" id="profile-purchase-heading">Purchase history</h2>' +
          '<p class="profile-stack__lede layout-muted"></p>' +
          '<div class="profile-stack__list" data-profile-purchase-list></div>' +
          '<div class="catalog-actions">' +
          '<button type="button" class="btn btn_primary" data-profile-purchase-more hidden>Load more</button>' +
          "</div>" +
          "</section>" +
          '<section class="profile-stack layout__section" aria-labelledby="profile-subs-heading">' +
          '<h2 class="profile-stack__title" id="profile-subs-heading">Subscription</h2>' +
          '<div class="profile-stack__list" data-profile-sub-list></div>' +
          '<div class="catalog-actions">' +
          '<button type="button" class="btn btn_primary" data-profile-sub-more hidden>Load more</button>' +
          "</div>" +
          "</section>" +
          '<section class="profile-stack layout__section" aria-labelledby="profile-events-heading">' +
          '<h2 class="profile-stack__title" id="profile-events-heading">Events</h2>' +
          '<p class="profile-stack__lede layout-muted"></p>' +
          '<div class="profile-events-strip" data-profile-event-list></div>' +
          '<div class="catalog-actions">' +
          '<button type="button" class="btn btn_primary" data-profile-event-more hidden>Load more</button>' +
          "</div>" +
          "</section>";

        if (statusEl) {
          statusEl.textContent = "";
        }

        attachPagedSection(
          root,
          "[data-profile-purchase-more]",
          "[data-profile-purchase-list]",
          purchaseSorted,
          PAGE_HISTORY,
          function (line) {
            var thumb = line.imageUrl
              ? '<img class="profile-history-card__img" src="' +
                escapeHtml(line.imageUrl) +
                '" alt="" width="56" height="56" loading="lazy">'
              : '<span class="profile-history-card__img-fallback" aria-hidden="true"></span>';
            var meta =
              "Qty " +
              escapeHtml(String(line.qty)) +
              " · " +
              money(line.unitPrice) +
              " · " +
              formatIsoDateYYYYMMDD(line.createdDate);
            return (
              '<article class="profile-history-card">' +
              '<div class="profile-history-card__media">' +
              thumb +
              "</div>" +
              '<div class="profile-history-card__body">' +
              '<h3 class="profile-history-card__title">' +
              escapeHtml(line.name || line.sku || "Item") +
              "</h3>" +
              '<p class="profile-history-card__meta">' +
              meta +
              "</p>" +
              "</div></article>"
            );
          },
          '<p class="profile-stack__empty layout-muted">Basket is empty — add items from the catalogue.</p>',
        );

        return Promise.all(
          mySubs.map(function (sub) {
            var store = sub.category === "equipment" ? "equipment" : "coffee";
            return window.BeanBoutiqueDB.getRecord(store, sub.productId).then(
              function (product) {
                return { sub: sub, product: product };
              },
            );
          }),
        ).then(function (pairs) {
          var renderedRows = pairs.map(function (pair) {
            var sub = pair.sub;
            var product = pair.product;
            var imgUrl =
              product && product.imageUrl ? escapeHtml(product.imageUrl) : "";
            var thumb = imgUrl
              ? '<img class="profile-sub-card__img" src="' +
                imgUrl +
                '" alt="" width="56" height="56" loading="lazy">'
              : '<span class="profile-sub-card__img-fallback" aria-hidden="true"></span>';
            var href =
              "../subscriptions/items/subscription.html?id=" +
              encodeURIComponent(sub.id);
            var dates =
              "Started " +
              formatIsoDateYYYYMMDD(sub.subscribeDate) +
              " · Renews through " +
              formatIsoDateYYYYMMDD(sub.expireDate);
            return (
              '<article class="profile-sub-card">' +
              '<div class="profile-sub-card__media">' +
              thumb +
              "</div>" +
              '<div class="profile-sub-card__body">' +
              '<h3 class="profile-sub-card__title"><a href="' +
              href +
              '">' +
              escapeHtml(sub.name || "Subscription") +
              "</a></h3>" +
              '<p class="profile-sub-card__meta">' +
              dates +
              " · " +
              money(sub.totalPrice) +
              "</p>" +
              "</div></article>"
            );
          });

          var subListEl = root.querySelector("[data-profile-sub-list]");
          var subBtn = root.querySelector("[data-profile-sub-more]");
          var visibleS = Math.min(PAGE_SUBS, renderedRows.length);
          function redrawSubs() {
            if (!renderedRows.length) {
              subListEl.innerHTML =
                '<p class="profile-stack__empty layout-muted">No subscriptions for this profile.</p>';
              subBtn.hidden = true;
              return;
            }
            subListEl.innerHTML = renderedRows.slice(0, visibleS).join("");
            subBtn.hidden = visibleS >= renderedRows.length;
          }
          redrawSubs();
          subBtn.addEventListener("click", function () {
            visibleS = Math.min(visibleS + PAGE_SUBS, renderedRows.length);
            redrawSubs();
          });

          attachPagedSection(
            root,
            "[data-profile-event-more]",
            "[data-profile-event-list]",
            myEvents,
            PAGE_EVENTS,
            function (ev) {
              var href =
                "../events/items/event.html?id=" + encodeURIComponent(ev.id);
              return (
                '<a class="profile-event-chip" href="' +
                href +
                '">' +
                '<span class="profile-event-chip__name">' +
                escapeHtml(ev.name || "Workshop") +
                "</span>" +
                '<span class="profile-event-chip__when">' +
                formatIsoDateYYYYMMDD(ev.date) +
                " · " +
                escapeHtml(ev.venue || "") +
                "</span>" +
                "</a>"
              );
            },
            '<p class="profile-stack__empty layout-muted">No linked workshops yet — RSVP from Events (matching profile email or <strong>userId</strong> on attendee rows).</p>',
          );
        });
      })
      .catch(function () {
        root.innerHTML =
          '<p class="layout-muted">Could not load profile data from IndexedDB.</p>';
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
