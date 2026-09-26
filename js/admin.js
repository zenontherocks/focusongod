// Jewelry admin console: password gate, add/edit/delete listings, each
// with up to MAX_LISTING_IMAGES photos and up to MAX_LISTING_VIDEOS short
// video clips. Talks to the Cloudflare Worker routes under
// src/routes/jewelry-*.js, which commit changes straight to the site's
// GitHub repo.
//
// The "Add a new listing" form doubles as the edit form: clicking a
// listing's Edit button repopulates it (title/description/price, plus
// its existing photos/videos as removable thumbnails) and switches it
// into edit mode until submitted or cancelled.

(function () {
  var escapeHtml = window.FogDomUtils.escapeHtml;
  var escapeAttr = window.FogDomUtils.escapeAttr;
  var PASSWORD_KEY = "fog_admin_password";
  var MAX_DIMENSION = 1200;
  var JPEG_QUALITY = 0.82;
  var MAX_LISTING_IMAGES = 8; // keep in sync with MAX_IMAGES in src/routes/jewelry-create.js
  var MAX_LISTING_VIDEOS = 2; // keep in sync with MAX_VIDEOS in src/routes/jewelry-create.js
  var MAX_VIDEO_BYTES = 8 * 1024 * 1024; // keep in sync with MAX_VIDEO_BYTES in src/routes/jewelry-create.js

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

  function readFileAsDataUrl(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        resolve(reader.result);
      };
      reader.onerror = function () {
        reject(new Error("Could not read that video file."));
      };
      reader.readAsDataURL(file);
    });
  }

  // iPhones default to recording HEVC (H.265), which every major browser
  // besides Safari fails to decode at all — not a quality issue, just a
  // silent "no supported format" failure. There's no way to transcode on
  // this no-build-tools static site, so we catch it here before wasting
  // an upload (and a commit) on a video most visitors couldn't watch.
  // HEVC/H.265 tracks in an MP4 container are tagged with an "hvc1" or
  // "hev1" fourcc — cheap to check for directly in the raw bytes.
  function containsHevc(arrayBuffer) {
    var bytes = new Uint8Array(arrayBuffer);
    var markers = ["hvc1", "hev1"].map(function (s) {
      return [s.charCodeAt(0), s.charCodeAt(1), s.charCodeAt(2), s.charCodeAt(3)];
    });
    for (var i = 0; i < bytes.length - 3; i++) {
      for (var m = 0; m < markers.length; m++) {
        var mk = markers[m];
        if (bytes[i] === mk[0] && bytes[i + 1] === mk[1] && bytes[i + 2] === mk[2] && bytes[i + 3] === mk[3]) {
          return true;
        }
      }
    }
    return false;
  }

  function checkHevcAndReadVideos(videoFiles) {
    return Promise.all(
      videoFiles.map(function (file) {
        return file.arrayBuffer().then(function (buffer) {
          if (containsHevc(buffer)) {
            throw new Error(
              'The video "' +
                file.name +
                "\" uses HEVC/H.265 encoding, which most browsers besides Safari can't play. " +
                'On iPhone: Settings → Camera → Formats → "Most Compatible", then re-record or re-export and try again.'
            );
          }
          return readFileAsDataUrl(file);
        });
      })
    );
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

  function itemImages(item) {
    return item.images && item.images.length ? item.images : item.image ? [item.image] : [];
  }

  function itemVideos(item) {
    return item.videos && item.videos.length ? item.videos : [];
  }

  var listingsById = {};

  function renderListings(items) {
    var container = document.getElementById("admin-listings");
    listingsById = {};
    items.forEach(function (item) {
      listingsById[item.id] = item;
    });
    if (!items.length) {
      container.innerHTML = '<p class="admin-empty">No listings yet.</p>';
      return;
    }
    container.innerHTML = items
      .map(function (item) {
        var images = itemImages(item);
        var videos = itemVideos(item);
        var imageStyle = images.length
          ? ' style="background-image: url(\'' + escapeHtml(images[0]) + "')\""
          : "";
        return (
          '<div class="admin-listing" data-id="' + escapeAttr(item.id) + '">' +
          '<div class="admin-listing__image"' + imageStyle + ">" +
          (images.length > 1
            ? '<span class="admin-listing__image-count">+' + (images.length - 1) + "</span>"
            : "") +
          (videos.length
            ? '<span class="admin-listing__video-count">&#9658;' + videos.length + "</span>"
            : "") +
          "</div>" +
          '<div class="admin-listing__body">' +
          "<h3>" + escapeHtml(item.title) + "</h3>" +
          '<p class="admin-listing__price">' + formatPrice(item.price) + "</p>" +
          (item.description ? "<p>" + escapeHtml(item.description) + "</p>" : "") +
          '<div class="admin-listing__actions">' +
          '<button type="button" class="admin-listing__edit" data-id="' +
          escapeAttr(item.id) +
          '">Edit</button>' +
          '<button type="button" class="admin-listing__delete" data-id="' +
          escapeAttr(item.id) +
          '">Delete</button>' +
          "</div>" +
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
    var listingIdField = document.getElementById("listing-id");
    var listingFormHeading = document.getElementById("listing-form-heading");
    var listingFormSubmit = document.getElementById("listing-form-submit");
    var listingFormCancel = document.getElementById("listing-form-cancel");
    var listingImageLabel = document.getElementById("listing-image-label");
    var existingImagesRow = document.getElementById("listing-existing-images-row");
    var existingImagesContainer = document.getElementById("listing-existing-images");

    var editKeepImages = []; // mutable while editing: images kept if the form is submitted
    var editKeepVideos = []; // mutable while editing: videos kept if the form is submitted

    function renderExistingMedia() {
      var imageItems = editKeepImages.map(function (path) {
        return (
          '<div class="admin-existing-image" data-path="' + escapeAttr(path) + '" data-type="image">' +
          '<div class="admin-existing-image__thumb" style="background-image: url(\'' +
          escapeHtml(path) +
          "')\"></div>" +
          '<button type="button" class="admin-existing-image__remove" aria-label="Remove this photo">&times;</button>' +
          "</div>"
        );
      });
      var videoItems = editKeepVideos.map(function (path) {
        return (
          '<div class="admin-existing-image" data-path="' + escapeAttr(path) + '" data-type="video">' +
          '<video class="admin-existing-image__thumb admin-existing-image__video" src="' +
          escapeAttr(path) +
          '" muted preload="metadata"></video>' +
          '<button type="button" class="admin-existing-image__remove" aria-label="Remove this video">&times;</button>' +
          "</div>"
        );
      });
      existingImagesContainer.innerHTML = imageItems.concat(videoItems).join("");
    }

    function enterEditMode(item) {
      listingIdField.value = item.id;
      editKeepImages = itemImages(item).slice();
      editKeepVideos = itemVideos(item).slice();
      document.getElementById("listing-title").value = item.title || "";
      document.getElementById("listing-description").value = item.description || "";
      document.getElementById("listing-price").value = item.price != null ? item.price : "";
      document.getElementById("listing-image").value = "";

      existingImagesRow.hidden = false;
      renderExistingMedia();
      listingImageLabel.textContent =
        "Add more photos/videos (optional, up to " + MAX_LISTING_IMAGES + " photos / " + MAX_LISTING_VIDEOS + " videos total)";
      listingFormHeading.textContent = "Edit listing";
      listingFormSubmit.textContent = "Save Changes";
      listingFormCancel.hidden = false;
      listingStatus.textContent = "";
      listingForm.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function exitEditMode() {
      listingIdField.value = "";
      editKeepImages = [];
      editKeepVideos = [];
      existingImagesRow.hidden = true;
      existingImagesContainer.innerHTML = "";
      listingImageLabel.textContent =
        "Photos and/or videos * (up to " + MAX_LISTING_IMAGES + " photos / " + MAX_LISTING_VIDEOS + " videos, 8MB each video)";
      listingFormHeading.textContent = "Add a new listing";
      listingFormSubmit.textContent = "Add Listing";
      listingFormCancel.hidden = true;
      listingForm.reset();
    }

    listingFormCancel.addEventListener("click", exitEditMode);

    existingImagesContainer.addEventListener("click", function (event) {
      var button = event.target.closest(".admin-existing-image__remove");
      if (!button) return;
      var wrap = button.closest(".admin-existing-image");
      var path = wrap.getAttribute("data-path");
      var type = wrap.getAttribute("data-type");
      if (type === "video") {
        editKeepVideos = editKeepVideos.filter(function (p) {
          return p !== path;
        });
      } else {
        editKeepImages = editKeepImages.filter(function (p) {
          return p !== path;
        });
      }
      renderExistingMedia();
    });

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
      var files = Array.prototype.slice.call(fileInput.files);
      var editingId = listingIdField.value;

      var imageFiles = files.filter(function (f) {
        return f.type.indexOf("image/") === 0;
      });
      var videoFiles = files.filter(function (f) {
        return f.type.indexOf("video/") === 0;
      });
      if (imageFiles.length + videoFiles.length !== files.length) {
        listingStatus.textContent = "Please choose only image or video files.";
        return;
      }
      var oversizedVideo = videoFiles.filter(function (f) {
        return f.size > MAX_VIDEO_BYTES;
      });
      if (oversizedVideo.length) {
        listingStatus.textContent =
          "Each video must be under " + MAX_VIDEO_BYTES / (1024 * 1024) + "MB (" + oversizedVideo[0].name + " is too large).";
        return;
      }

      if (editingId) {
        var totalImages = editKeepImages.length + imageFiles.length;
        var totalVideos = editKeepVideos.length + videoFiles.length;
        if (totalImages === 0 && totalVideos === 0) {
          listingStatus.textContent = "A listing needs at least one photo or video.";
          return;
        }
        if (totalImages > MAX_LISTING_IMAGES) {
          listingStatus.textContent = "A listing can have at most " + MAX_LISTING_IMAGES + " photos total.";
          return;
        }
        if (totalVideos > MAX_LISTING_VIDEOS) {
          listingStatus.textContent = "A listing can have at most " + MAX_LISTING_VIDEOS + " videos total.";
          return;
        }

        listingStatus.textContent = "Saving...";

        Promise.all([Promise.all(imageFiles.map(resizeImageFile)), checkHevcAndReadVideos(videoFiles)])
          .then(function (results) {
            return apiRequest("/api/jewelry-update", {
              id: editingId,
              title: title,
              description: description,
              price: price,
              keepImages: editKeepImages,
              newImageDataUrls: results[0],
              keepVideos: editKeepVideos,
              newVideoDataUrls: results[1],
            });
          })
          .then(function () {
            listingStatus.textContent = "Saved! Changes will appear shortly.";
            exitEditMode();
            loadListings();
          })
          .catch(function (err) {
            listingStatus.textContent = "Error: " + err.message;
          });
        return;
      }

      if (!imageFiles.length && !videoFiles.length) {
        listingStatus.textContent = "Please choose at least one photo or video.";
        return;
      }
      if (imageFiles.length > MAX_LISTING_IMAGES) {
        listingStatus.textContent = "Please choose at most " + MAX_LISTING_IMAGES + " photos.";
        return;
      }
      if (videoFiles.length > MAX_LISTING_VIDEOS) {
        listingStatus.textContent = "Please choose at most " + MAX_LISTING_VIDEOS + " videos.";
        return;
      }

      listingStatus.textContent = "Uploading...";

      Promise.all([Promise.all(imageFiles.map(resizeImageFile)), checkHevcAndReadVideos(videoFiles)])
        .then(function (results) {
          return apiRequest("/api/jewelry-create", {
            title: title,
            description: description,
            price: price,
            imageDataUrls: results[0],
            videoDataUrls: results[1],
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
      var editButton = event.target.closest(".admin-listing__edit");
      if (editButton) {
        var item = listingsById[editButton.getAttribute("data-id")];
        if (item) enterEditMode(item);
        return;
      }

      var button = event.target.closest(".admin-listing__delete");
      if (!button) return;
      var id = button.getAttribute("data-id");
      if (!window.confirm("Delete this listing?")) return;
      button.disabled = true;
      button.textContent = "Deleting...";
      apiRequest("/api/jewelry-delete", { id: id })
        .then(function () {
          if (listingIdField.value === id) exitEditMode();
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
