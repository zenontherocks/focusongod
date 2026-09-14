// Jewelry admin console: password gate, resize/upload a new listing photo,
// and list/delete existing listings. Talks to the Cloudflare Worker routes
// under src/routes/jewelry-*.js, which commit changes straight to the
// site's GitHub repo.

(function () {
  var PASSWORD_KEY = "fog_admin_password";
  var MAX_DIMENSION = 1200;
  var JPEG_QUALITY = 0.82;

  function getStoredPassword() {
    try {
      return sessionStorage.getItem(PASSWORD_KEY) || "";
    } catch (e) {
      return "";
    }
  }

  function setStoredPassword(value) {
    try {
      sessionStorage.setItem(PASSWORD_KEY, value);
    } catch (e) {
      // ignore (private browsing etc.) — password just won't persist across reloads
    }
  }

  function resizeImageFile(file) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      var url = URL.createObjectURL(file);
      img.onload = function () {
        URL.revokeObjectURL(url);
        var scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
        var width = Math.max(1, Math.round(img.width * scale));
        var height = Math.max(1, Math.round(img.height * scale));
        var canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        var ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
      };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error("Could not read that image file."));
      };
      img.src = url;
    });
  }

  function apiRequest(path, body) {
    return fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Password": getStoredPassword(),
      },
      body: JSON.stringify(body),
    }).then(function (response) {
      return response.text().then(function (text) {
        var data = {};
        try {
          data = text ? JSON.parse(text) : {};
        } catch (e) {
          // Non-JSON response (e.g. a plain 404/500 page) — fall through
          // with an empty data object so we still surface the real status.
        }
        if (!response.ok) {
          var detail = data.error || (text ? text.slice(0, 300) : "");
          if (data.debug) {
            detail +=
              " (sent " +
              data.debug.providedLength +
              " characters, expected " +
              data.debug.expectedLength +
              ")";
          }
          throw new Error("HTTP " + response.status + (detail ? ": " + detail : ""));
        }
        return data;
      });
    });
  }

  function formatPrice(value) {
    var num = Number(value);
    return isNaN(num) ? "" : "$" + num.toFixed(2);
  }

  function escapeHtml(value) {
    var div = document.createElement("div");
    div.textContent = value == null ? "" : value;
    return div.innerHTML;
  }

  function renderListings(items) {
    var container = document.getElementById("admin-listings");
    if (!items.length) {
      container.innerHTML = '<p class="admin-empty">No listings yet.</p>';
      return;
    }
    container.innerHTML = items
      .map(function (item) {
        var imageStyle = item.image
          ? ' style="background-image: url(\'' + escapeHtml(item.image) + "')\""
          : "";
        return (
          '<div class="admin-listing" data-id="' + escapeHtml(item.id) + '">' +
          '<div class="admin-listing__image"' + imageStyle + "></div>" +
          '<div class="admin-listing__body">' +
          "<h3>" + escapeHtml(item.title) + "</h3>" +
          '<p class="admin-listing__price">' + formatPrice(item.price) + "</p>" +
          (item.description ? "<p>" + escapeHtml(item.description) + "</p>" : "") +
          '<button type="button" class="admin-listing__delete" data-id="' +
          escapeHtml(item.id) +
          '">Delete</button>' +
          "</div>" +
          "</div>"
        );
      })
      .join("");
  }

  function loadListings() {
    var statusEl = document.getElementById("listings-status");
    statusEl.textContent = "Loading...";
    return fetch("data/jewelry-listings.json?_=" + Date.now())
      .then(function (response) {
        if (!response.ok) throw new Error("Could not load listings.");
        return response.json();
      })
      .then(function (data) {
        statusEl.textContent = "";
        renderListings((data && data.items) || []);
      })
      .catch(function (err) {
        statusEl.textContent = err.message;
      });
  }

  document.addEventListener("DOMContentLoaded", function () {
    var lockSection = document.getElementById("admin-lock");
    var contentSection = document.getElementById("admin-content");
    var loginForm = document.getElementById("admin-login-form");
    var loginStatus = document.getElementById("admin-login-status");
    var listingForm = document.getElementById("listing-form");
    var listingStatus = document.getElementById("listing-form-status");

    function unlock() {
      lockSection.hidden = true;
      contentSection.hidden = false;
      loadListings();
    }

    function tryStoredPassword() {
      if (!getStoredPassword()) return;
      apiRequest("/api/jewelry-auth-check", {}).then(unlock).catch(function () {
        setStoredPassword("");
      });
    }

    tryStoredPassword();

    loginForm.addEventListener("submit", function (event) {
      event.preventDefault();
      var value = document.getElementById("admin-password").value.trim();
      setStoredPassword(value);
      loginStatus.textContent = "Checking...";
      apiRequest("/api/jewelry-auth-check", {})
        .then(function () {
          loginStatus.textContent = "";
          unlock();
        })
        .catch(function (err) {
          loginStatus.textContent = String(err.message || "Something went wrong.");
          setStoredPassword("");
        });
    });

    listingForm.addEventListener("submit", function (event) {
      event.preventDefault();
      var fileInput = document.getElementById("listing-image");
      var title = document.getElementById("listing-title").value.trim();
      var description = document.getElementById("listing-description").value.trim();
      var price = document.getElementById("listing-price").value;
      var file = fileInput.files[0];

      if (!file) {
        listingStatus.textContent = "Please choose a photo.";
        return;
      }

      listingStatus.textContent = "Uploading...";

      resizeImageFile(file)
        .then(function (imageDataUrl) {
          return apiRequest("/api/jewelry-create", {
            title: title,
            description: description,
            price: price,
            imageDataUrl: imageDataUrl,
          });
        })
        .then(function () {
          listingStatus.textContent = "Added! It'll appear on the site shortly.";
          listingForm.reset();
          loadListings();
        })
        .catch(function (err) {
          listingStatus.textContent = "Error: " + err.message;
        });
    });

    document.getElementById("admin-listings").addEventListener("click", function (event) {
      var button = event.target.closest(".admin-listing__delete");
      if (!button) return;
      var id = button.getAttribute("data-id");
      if (!window.confirm("Delete this listing?")) return;
      button.disabled = true;
      button.textContent = "Deleting...";
      apiRequest("/api/jewelry-delete", { id: id })
        .then(function () {
          loadListings();
        })
        .catch(function (err) {
          window.alert("Error: " + err.message);
          button.disabled = false;
          button.textContent = "Delete";
        });
    });
  });
})();
