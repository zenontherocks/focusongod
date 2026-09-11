// Renders the jewelry/other-for-sale page's listings grid from
// data/ebay-listings.json, which .github/workflows/update-ebay-listings.yml
// keeps updated automatically from the seller's real eBay listings.

(function () {
  var EBAY_STORE_URL = "https://www.ebay.com/usr/northst9155";

  function escapeHtml(value) {
    var div = document.createElement("div");
    div.textContent = value == null ? "" : value;
    return div.innerHTML;
  }

  function renderCard(item) {
    var imageStyle = item.image
      ? ' style="background-image: url(\'' + escapeHtml(item.image) + '\')"'
      : "";
    return (
      '<div class="listing-card">' +
      '<div class="listing-card__image"' +
      imageStyle +
      "></div>" +
      '<div class="listing-card__body">' +
      "<h3>" +
      escapeHtml(item.title) +
      "</h3>" +
      (item.price ? '<p class="listing-card__price">' + escapeHtml(item.price) + "</p>" : "") +
      '<a class="btn btn--primary" href="' +
      escapeHtml(item.url) +
      '" target="_blank" rel="noopener">View on eBay</a>' +
      "</div>" +
      "</div>"
    );
  }

  function renderEmptyState() {
    return (
      '<p class="listings-empty">' +
      "Listings aren't available here right now. In the meantime, " +
      '<a href="' +
      EBAY_STORE_URL +
      '" target="_blank" rel="noopener">visit our eBay store directly</a>.' +
      "</p>"
    );
  }

  function formatUpdatedAt(isoString) {
    if (!isoString) return "";
    var date = new Date(isoString);
    if (isNaN(date.getTime())) return "";
    return "Listings last updated " + date.toLocaleString();
  }

  document.addEventListener("DOMContentLoaded", function () {
    var grid = document.getElementById("ebay-listings-grid");
    var updatedEl = document.getElementById("listings-updated");
    if (!grid) return;

    fetch("data/ebay-listings.json")
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
