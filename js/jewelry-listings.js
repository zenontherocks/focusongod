// Renders the jewelry/other-for-sale page's listings grid from
// data/jewelry-listings.json, which the admin console (admin.html,
// js/admin.js, src/routes/jewelry-*.js) keeps updated. Each card gets
// its own "Buy" button wired to the shared checkout modal (see
// js/checkout-modal.js) via data-item-* attributes.

(function () {
  function escapeHtml(value) {
    var div = document.createElement("div");
    div.textContent = value == null ? "" : value;
    return div.innerHTML;
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/"/g, "&quot;");
  }

  function formatPrice(value) {
    var num = Number(value);
    return isNaN(num) ? "" : "$" + num.toFixed(2);
  }

  function renderCard(item) {
    var imageStyle = item.image
      ? ' style="background-image: url(\'' + escapeHtml(item.image) + "')\""
      : "";
    var priceStr = (Number(item.price) || 0).toFixed(2);
    var subject = "New order: Jewelry — " + item.title + " ($" + priceStr + ")";
    return (
      '<div class="listing-card">' +
      '<div class="listing-card__image"' +
      imageStyle +
      "></div>" +
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
