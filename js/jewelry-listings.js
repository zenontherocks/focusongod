// Renders the jewelry/other-for-sale page's listings grid from
// data/jewelry-listings.json, which the admin console (admin.html,
// js/admin.js, src/routes/jewelry-*.js) keeps updated. Each card gets
// its own "Buy" button wired to the shared checkout modal (see
// js/checkout-modal.js) via data-item-* attributes.
//
// A listing can have several photos and (optionally) a couple of short
// video clips: each card is a small carousel over that combined media
// set (left/right arrows, shown only when there's more than one item),
// images first then videos. Clicking the current slide opens it
// full-size in a lightbox with its own left/right navigation over the
// same media set.

(function () {
  var escapeHtml = window.FogDomUtils.escapeHtml;
  var escapeAttr = window.FogDomUtils.escapeAttr;

  var itemsById = {};

  function itemMedia(item) {
    var images = item.images && item.images.length ? item.images : item.image ? [item.image] : [];
    var videos = item.videos && item.videos.length ? item.videos : [];
    return images.map(function (path) {
      return { path: path, type: "image" };
    }).concat(
      videos.map(function (path) {
        return { path: path, type: "video" };
      })
    );
  }

  function formatPrice(value) {
    var num = Number(value);
    return isNaN(num) ? "" : "$" + num.toFixed(2);
  }

  function backgroundStyleFor(imagePath) {
    return imagePath ? "background-image: url(" + JSON.stringify(imagePath) + ")" : "";
  }

  function slideMarkup(media, index) {
    if (media.type === "video") {
      return (
        '<div class="listing-card__slide listing-card__video-wrap" data-index="' + index + '" ' +
        'data-type="video" tabindex="0" role="button" aria-label="Play video">' +
        '<video class="listing-card__video-el" src="' + escapeAttr(media.path) + '" ' +
        'muted playsinline preload="metadata"></video>' +
        '<span class="listing-card__play-icon" aria-hidden="true">&#9658;</span>' +
        "</div>"
      );
    }
    return (
      '<div class="listing-card__slide listing-card__image" data-index="' + index + '" ' +
      'data-type="image" tabindex="0" role="button" aria-label="View full image" style="' +
      escapeAttr(backgroundStyleFor(media.path)) +
      '"></div>'
    );
  }

  function renderCard(item) {
    itemsById[item.id] = item;
    var media = itemMedia(item);
    var priceStr = (Number(item.price) || 0).toFixed(2);
    var subject = "New order: Jewelry — " + item.title + " ($" + priceStr + ")";

    var carousel =
      '<div class="listing-card__carousel">' +
      slideMarkup(media[0] || { path: "", type: "image" }, 0) +
      (media.length > 1
        ? '<button type="button" class="listing-card__arrow listing-card__arrow--prev" aria-label="Previous item">&#10094;</button>' +
          '<button type="button" class="listing-card__arrow listing-card__arrow--next" aria-label="Next item">&#10095;</button>' +
          '<p class="listing-card__counter">1 / ' + media.length + "</p>"
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

    function setCardMedia(carousel, media, index) {
      var wrapped = (index + media.length) % media.length;
      var oldSlide = carousel.querySelector(".listing-card__slide");
      if (oldSlide) {
        var oldVideo = oldSlide.querySelector("video");
        if (oldVideo) oldVideo.pause();
        oldSlide.remove();
      }
      var wrapper = document.createElement("div");
      wrapper.innerHTML = slideMarkup(media[wrapped], wrapped);
      carousel.insertBefore(wrapper.firstChild, carousel.firstChild);
      var counter = carousel.querySelector(".listing-card__counter");
      if (counter) counter.textContent = wrapped + 1 + " / " + media.length;
    }

    function stepCard(card, delta) {
      var item = itemsById[card.getAttribute("data-id")];
      if (!item) return;
      var media = itemMedia(item);
      if (media.length < 2) return;
      var carousel = card.querySelector(".listing-card__carousel");
      var slide = carousel.querySelector(".listing-card__slide");
      var current = parseInt(slide.getAttribute("data-index"), 10) || 0;
      setCardMedia(carousel, media, current + delta);
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
      var slideEl = event.target.closest(".listing-card__slide");
      if (slideEl) {
        var card = slideEl.closest(".listing-card");
        var item = itemsById[card.getAttribute("data-id")];
        if (!item) return;
        var index = parseInt(slideEl.getAttribute("data-index"), 10) || 0;
        openLightbox(itemMedia(item), index, slideEl);
      }
    });

    grid.addEventListener("keydown", function (event) {
      if (event.key !== "Enter" && event.key !== " ") return;
      var slideEl = event.target.closest(".listing-card__slide");
      if (!slideEl) return;
      event.preventDefault();
      var card = slideEl.closest(".listing-card");
      var item = itemsById[card.getAttribute("data-id")];
      if (!item) return;
      var index = parseInt(slideEl.getAttribute("data-index"), 10) || 0;
      openLightbox(itemMedia(item), index, slideEl);
    });

    // ---------- Lightbox ----------

    var lightbox = document.getElementById("lightbox");
    var lightboxImage = document.getElementById("lightbox-image");
    var lightboxVideo = document.getElementById("lightbox-video");
    var lightboxCounter = document.getElementById("lightbox-counter");
    var lightboxPrev = document.getElementById("lightbox-prev");
    var lightboxNext = document.getElementById("lightbox-next");
    var lightboxCloseTriggers = lightbox ? lightbox.querySelectorAll("[data-lightbox-close]") : [];

    var lightboxMedia = [];
    var lightboxIndex = 0;
    var lightboxOpener = null;

    function showLightboxMedia(index) {
      lightboxIndex = (index + lightboxMedia.length) % lightboxMedia.length;
      var media = lightboxMedia[lightboxIndex];

      if (!lightboxVideo.paused) lightboxVideo.pause();

      if (media.type === "video") {
        lightboxImage.hidden = true;
        lightboxImage.src = "";
        lightboxVideo.hidden = false;
        if (lightboxVideo.getAttribute("src") !== media.path) {
          lightboxVideo.src = media.path;
        }
      } else {
        lightboxVideo.hidden = true;
        lightboxVideo.removeAttribute("src");
        lightboxVideo.load();
        lightboxImage.hidden = false;
        lightboxImage.src = media.path;
      }

      lightboxCounter.textContent = lightboxMedia.length > 1 ? lightboxIndex + 1 + " / " + lightboxMedia.length : "";
      var showArrows = lightboxMedia.length > 1;
      lightboxPrev.hidden = !showArrows;
      lightboxNext.hidden = !showArrows;
    }

    function onLightboxKeydown(event) {
      if (event.key === "Escape") {
        closeLightbox();
      } else if (event.key === "ArrowLeft") {
        showLightboxMedia(lightboxIndex - 1);
      } else if (event.key === "ArrowRight") {
        showLightboxMedia(lightboxIndex + 1);
      }
    }

    function openLightbox(media, startIndex, opener) {
      if (!lightbox || !media.length) return;
      lightboxMedia = media;
      lightboxOpener = opener;
      showLightboxMedia(startIndex);
      lightbox.hidden = false;
      document.body.style.overflow = "hidden";
      document.addEventListener("keydown", onLightboxKeydown);
      lightbox.querySelector(".lightbox__close").focus();
    }

    function closeLightbox() {
      if (!lightbox) return;
      lightboxVideo.pause();
      lightbox.hidden = true;
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onLightboxKeydown);
      if (lightboxOpener) lightboxOpener.focus();
    }

    if (lightbox) {
      lightboxPrev.addEventListener("click", function () {
        showLightboxMedia(lightboxIndex - 1);
      });
      lightboxNext.addEventListener("click", function () {
        showLightboxMedia(lightboxIndex + 1);
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
