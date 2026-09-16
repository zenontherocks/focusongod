// Renders the jewelry/other-for-sale page's listings grid from
// data/jewelry-listings.json, which the admin console (admin.html,
// js/admin.js, src/routes/jewelry-*.js) keeps updated. Each card gets
// its own "Buy" button wired to the shared checkout modal (see
// js/checkout-modal.js) via data-item-* attributes.
//
// A listing can have several photos: each card is a small carousel
// (left/right arrows, shown only when there's more than one image),
// and clicking the current photo opens it full-size in a lightbox with
// its own left/right navigation over the same image set.

(function () {
  var escapeHtml = window.FogDomUtils.escapeHtml;
  var escapeAttr = window.FogDomUtils.escapeAttr;

  var itemsById = {};

  function itemImages(item) {
    return item.images && item.images.length ? item.images : item.image ? [item.image] : [];
  }

  function formatPrice(value) {
    var num = Number(value);
    return isNaN(num) ? "" : "$" + num.toFixed(2);
  }

  function backgroundStyleFor(imagePath) {
    return imagePath ? "background-image: url(" + JSON.stringify(imagePath) + ")" : "";
  }

  function renderCard(item) {
    itemsById[item.id] = item;
    var images = itemImages(item);
    var priceStr = (Number(item.price) || 0).toFixed(2);
    var subject = "New order: Jewelry — " + item.title + " ($" + priceStr + ")";

    var carousel =
      '<div class="listing-card__carousel">' +
      '<div class="listing-card__image" data-index="0" tabindex="0" role="button" ' +
      'aria-label="View full image" style="' +
      escapeAttr(backgroundStyleFor(images[0])) +
      '"></div>' +
      (images.length > 1
        ? '<button type="button" class="listing-card__arrow listing-card__arrow--prev" aria-label="Previous image">&#10094;</button>' +
          '<button type="button" class="listing-card__arrow listing-card__arrow--next" aria-label="Next image">&#10095;</button>' +
          '<p class="listing-card__counter">1 / ' + images.length + "</p>"
        : "") +
      "</div>";

    return (
      '<div class="listing-card" data-id="' + escapeAttr(item.id) + '">' +
      carousel +
      '<div class="listing-card__body">' +
      "<h3>" +
      escapeHtml(item.title) +
      "</h3>" +
      '<p class="listing-card__price">' +
      formatPrice(item.price) +
      "</p>" +
      (item.description ? "<p>" + escapeHtml(item.description) + "</p>" : "") +
      '<button type="button" class="btn btn--primary buy-button" ' +
      'data-item-title="' + escapeAttr(item.title) + '" ' +
      'data-item-price="' + priceStr + '" ' +
      'data-item-subject="' + escapeAttr(subject) + '">' +
      "Buy — " + formatPrice(item.price) +
      "</button>" +
      "</div>" +
      "</div>"
    );
  }

  function renderEmptyState() {
    return '<p class="listings-empty">No listings yet &mdash; check back soon!</p>';
  }

  function formatUpdatedAt(isoString) {
    if (!isoString) return "";
    var date = new Date(isoString);
    if (isNaN(date.getTime())) return "";
    return "Listings last updated " + date.toLocaleString();
  }

  document.addEventListener("DOMContentLoaded", function () {
    var grid = document.getElementById("listings-grid");
    var updatedEl = document.getElementById("listings-updated");
    if (!grid) return;

    // ---------- Card carousels ----------

    function setCardImage(imageEl, images, index) {
      imageEl.setAttribute("data-index", String(index));
      imageEl.style.backgroundImage = images[index] ? "url(" + JSON.stringify(images[index]) + ")" : "";
      var counter = imageEl.parentElement.querySelector(".listing-card__counter");
      if (counter) counter.textContent = index + 1 + " / " + images.length;
    }

    function stepCard(card, delta) {
      var item = itemsById[card.getAttribute("data-id")];
      if (!item) return;
      var images = itemImages(item);
      if (images.length < 2) return;
      var imageEl = card.querySelector(".listing-card__image");
      var current = parseInt(imageEl.getAttribute("data-index"), 10) || 0;
      var next = (current + delta + images.length) % images.length;
      setCardImage(imageEl, images, next);
    }

    grid.addEventListener("click", function (event) {
      var prevBtn = event.target.closest(".listing-card__arrow--prev");
      if (prevBtn) {
        stepCard(prevBtn.closest(".listing-card"), -1);
        return;
      }
      var nextBtn = event.target.closest(".listing-card__arrow--next");
      if (nextBtn) {
        stepCard(nextBtn.closest(".listing-card"), 1);
        return;
      }
      var imageEl = event.target.closest(".listing-card__image");
      if (imageEl) {
        var card = imageEl.closest(".listing-card");
        var item = itemsById[card.getAttribute("data-id")];
        if (!item) return;
        var index = parseInt(imageEl.getAttribute("data-index"), 10) || 0;
        openLightbox(itemImages(item), index, imageEl);
      }
    });

    grid.addEventListener("keydown", function (event) {
      if (event.key !== "Enter" && event.key !== " ") return;
      var imageEl = event.target.closest(".listing-card__image");
      if (!imageEl) return;
      event.preventDefault();
      var card = imageEl.closest(".listing-card");
      var item = itemsById[card.getAttribute("data-id")];
      if (!item) return;
      var index = parseInt(imageEl.getAttribute("data-index"), 10) || 0;
      openLightbox(itemImages(item), index, imageEl);
    });

    // ---------- Lightbox ----------

    var lightbox = document.getElementById("lightbox");
    var lightboxImage = document.getElementById("lightbox-image");
    var lightboxCounter = document.getElementById("lightbox-counter");
    var lightboxPrev = document.getElementById("lightbox-prev");
    var lightboxNext = document.getElementById("lightbox-next");
    var lightboxCloseTriggers = lightbox ? lightbox.querySelectorAll("[data-lightbox-close]") : [];

    var lightboxImages = [];
    var lightboxIndex = 0;
    var lightboxOpener = null;

    function showLightboxImage(index) {
      lightboxIndex = (index + lightboxImages.length) % lightboxImages.length;
      lightboxImage.src = lightboxImages[lightboxIndex];
      lightboxCounter.textContent = lightboxImages.length > 1 ? lightboxIndex + 1 + " / " + lightboxImages.length : "";
      var showArrows = lightboxImages.length > 1;
      lightboxPrev.hidden = !showArrows;
      lightboxNext.hidden = !showArrows;
    }

    function onLightboxKeydown(event) {
      if (event.key === "Escape") {
        closeLightbox();
      } else if (event.key === "ArrowLeft") {
        showLightboxImage(lightboxIndex - 1);
      } else if (event.key === "ArrowRight") {
        showLightboxImage(lightboxIndex + 1);
      }
    }

    function openLightbox(images, startIndex, opener) {
      if (!lightbox || !images.length) return;
      lightboxImages = images;
      lightboxOpener = opener;
      showLightboxImage(startIndex);
      lightbox.hidden = false;
      document.body.style.overflow = "hidden";
      document.addEventListener("keydown", onLightboxKeydown);
      lightbox.querySelector(".lightbox__close").focus();
    }

    function closeLightbox() {
      if (!lightbox) return;
      lightbox.hidden = true;
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onLightboxKeydown);
      if (lightboxOpener) lightboxOpener.focus();
    }

    if (lightbox) {
      lightboxPrev.addEventListener("click", function () {
        showLightboxImage(lightboxIndex - 1);
      });
      lightboxNext.addEventListener("click", function () {
        showLightboxImage(lightboxIndex + 1);
      });
      Array.prototype.forEach.call(lightboxCloseTriggers, function (trigger) {
        trigger.addEventListener("click", closeLightbox);
      });
    }

    // ---------- Load listings ----------

    fetch("data/jewelry-listings.json?_=" + Date.now())
      .then(function (response) {
        if (!response.ok) throw new Error("Failed to load listings");
        return response.json();
      })
      .then(function (data) {
        var items = (data && data.items) || [];
        if (updatedEl) updatedEl.textContent = formatUpdatedAt(data && data.generated_at);

        if (!items.length) {
          grid.innerHTML = renderEmptyState();
          return;
        }

        grid.innerHTML = items.map(renderCard).join("");
      })
      .catch(function () {
        grid.innerHTML = renderEmptyState();
      });
  });
})();
