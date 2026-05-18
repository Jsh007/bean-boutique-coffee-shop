/*
 * Eigbe Joshua, 224473, Frontend web development
 */

(function () {
  "use strict";

  function formatMoney(value) {
    return "£" + Number(value).toFixed(2);
  }

  function escape(raw) {
    return String(raw)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function redraw() {
    var body = document.querySelector("[data-cart-body]");
    var totalSlot = document.querySelector("[data-cart-total]");
    var hint = document.querySelector("[data-cart-status]");

    if (!body || !window.BeanBoutiqueDB) {
      if (hint) hint.textContent = "Unable to initialise cart view.";
      return;
    }

    window.BeanBoutiqueDB.getAll("cart")
      .then(function (lines) {
        if (!lines.length) {
          body.innerHTML =
            '<p class="cart-card-list__empty layout-muted">Basket is empty—add items from the catalogue or product pages.</p>';
          if (totalSlot) totalSlot.textContent = formatMoney(0);
          if (hint) hint.textContent = "";
          return;
        }

        lines.sort(function (a, b) {
          return (
            new Date(b.createdDate || "").getTime() -
            new Date(a.createdDate || "").getTime()
          );
        });

        body.innerHTML = lines
          .map(function (line) {
            var thumbBlock;
            if (line.imageUrl) {
              thumbBlock =
                '<div class="cart-line-card__media">' +
                '<img class="cart-line-card__img" src="' +
                escape(line.imageUrl) +
                '" alt="' +
                escape(line.name || line.sku || "Product") +
                '" loading="lazy" width="120" height="90">' +
                "</div>";
            } else {
              thumbBlock =
                '<div class="cart-line-card__media"><span class="cart-line-card__img-fallback" aria-hidden="true"></span></div>';
            }
            return (
              '<article class="cart-line-card" role="listitem">' +
              thumbBlock +
              '<div class="cart-line-card__content">' +
              '<header class="cart-line-card__header">' +
              '<h2 class="cart-line-card__title">' +
              escape(line.name || line.sku || "Product") +
              "</h2>" +
              '<p class="cart-line-card__sku">' +
              escape(line.sku || "—") +
              "</p>" +
              "</header>" +
              '<dl class="cart-line-card__stats">' +
              "<div><dt>Qty</dt><dd>" +
              escape(String(line.qty)) +
              "</dd></div>" +
              "<div><dt>Unit price</dt><dd>" +
              formatMoney(line.unitPrice) +
              "</dd></div>" +
              '<div><dt>Line total</dt><dd class="cart-line-card__line-total">' +
              formatMoney(line.totalPrice) +
              "</dd></div>" +
              "</dl>" +
              '<div class="cart-line-card__footer">' +
              '<button type="button" class="btn btn_ghost btn_compact" data-remove-cart="' +
              escape(line.id) +
              '">Remove</button>' +
              "</div>" +
              "</div>" +
              "</article>"
            );
          })
          .join("");

        var totals = lines.reduce(function (memo, row) {
          return memo + Number(row.totalPrice || 0);
        }, 0);
        if (totalSlot) totalSlot.textContent = formatMoney(totals);
        if (hint) hint.textContent = "";
      })
      .catch(function () {
        if (hint)
          hint.textContent = "IndexedDB unreachable—finish setup import.";
      });
  }

  function mountCart() {
    var body = document.querySelector("[data-cart-body]");

    if (!body || !window.BeanBoutiqueDB) {
      return;
    }

    body.addEventListener("click", function (evt) {
      var trigger = evt.target.closest("[data-remove-cart]");
      if (!trigger) {
        return;
      }
      var id = trigger.getAttribute("data-remove-cart");
      if (!id) {
        return;
      }
      trigger.disabled = true;
      window.BeanBoutiqueDB.deleteRecord("cart", id)
        .then(function () {
          document.dispatchEvent(new CustomEvent("beanboutique:cart-changed"));
          redraw();
        })
        .catch(function () {
          trigger.disabled = false;
        });
    });

    redraw();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountCart);
  } else {
    mountCart();
  }
})();
