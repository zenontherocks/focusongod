// Jewelry admin console: password gate, add/edit/delete listings (each
// with up to MAX_LISTING_IMAGES photos), and moderate discussion topics
// and messages. Talks to the Cloudflare Worker routes under
// src/routes/jewelry-*.js and src/routes/discussion-*.js, which commit
// changes straight to the site's GitHub repo (jewelry) or its D1
// database (discussion).
//
// The "Add a new listing" form doubles as the edit form: clicking a
// listing's Edit button repopulates it (title/description/price, plus
// its existing photos as removable thumbnails) and switches it into
// edit mode until submitted or cancelled.

(function () {
  var escapeHtml = window.FogDomUtils.escapeHtml;
  var escapeAttr = window.FogDomUtils.escapeAttr;
  var PASSWORD_KEY = "fog_admin_password";
  var MAX_DIMENSION = 1200;
  var JPEG_QUALITY = 0.82;
  var MAX_LISTING_IMAGES = 8; // keep in sync with MAX_IMAGES in src/routes/jewelry-create.js

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

  function fetchJson(path) {
    return fetch(path).then(function (response) {
      return response.text().then(function (text) {
        var data = {};
        try {
          data = text ? JSON.parse(text) : {};
        } catch (e) {
          // Non-JSON response — fall through with an empty object.
        }
        if (!response.ok) {
          throw new Error("HTTP " + response.status + (data.error ? ": " + data.error : ""));
        }
        return data;
      });
    });
  }

  function formatPrice(value) {
    var num = Number(value);
    return isNaN(num) ? "" : "$" + num.toFixed(2);
  }

  function formatDate(isoString) {
    var date = new Date(isoString);
    return isNaN(date.getTime()) ? "" : date.toLocaleString();
  }

  function itemImages(item) {
    return item.images && item.images.length ? item.images : item.image ? [item.image] : [];
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
        var imageStyle = images.length
          ? ' style="background-image: url(\'' + escapeHtml(images[0]) + "')\""
          : "";
        return (
          '<div class="admin-listing" data-id="' + escapeAttr(item.id) + '">' +
          '<div class="admin-listing__image"' + imageStyle + ">" +
          (images.length > 1
            ? '<span class="admin-listing__image-count">+' + (images.length - 1) + "</span>"
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

  function renderTopics(topics) {
    var container = document.getElementById("admin-topics");
    if (!topics.length) {
      container.innerHTML = '<p class="admin-empty">No discussion topics yet.</p>';
      return;
    }
    container.innerHTML = topics
      .map(function (topic) {
        return (
          '<div class="admin-listing" data-id="' + escapeAttr(topic.id) + '">' +
          '<div class="admin-listing__body">' +
          "<h3>" + escapeHtml(topic.title) + "</h3>" +
          (topic.description ? "<p>" + escapeHtml(topic.description) + "</p>" : "") +
          '<button type="button" class="admin-listing__delete admin-topic__delete" data-id="' +
          escapeAttr(topic.id) +
          '">Delete</button>' +
          "</div>" +
          "</div>"
        );
      })
      .join("");
  }

  function populateModerationSelect(topics) {
    var select = document.getElementById("moderation-topic-select");
    var currentValue = select.value;
    var options = ['<option value="">Select a topic…</option>'].concat(
      topics.map(function (topic) {
        return '<option value="' + escapeAttr(topic.id) + '">' + escapeHtml(topic.title) + "</option>";
      })
    );
    select.innerHTML = options.join("");
    if (topics.some(function (t) { return t.id === currentValue; })) {
      select.value = currentValue;
    }
  }

  function loadTopics() {
    var statusEl = document.getElementById("topics-status");
    statusEl.textContent = "Loading...";
    return fetchJson("/api/discussion-topics")
      .then(function (data) {
        statusEl.textContent = "";
        var topics = (data && data.topics) || [];
        renderTopics(topics);
        populateModerationSelect(topics);
        return topics;
      })
      .catch(function (err) {
        statusEl.textContent = err.message;
      });
  }

  function renderMessages(messages) {
    var container = document.getElementById("admin-messages");
    if (!messages.length) {
      container.innerHTML = '<p class="admin-empty">No messages in this topic yet.</p>';
      return;
    }
    container.innerHTML = messages
      .map(function (message) {
        return (
          '<div class="admin-message" data-id="' + escapeAttr(message.id) + '">' +
          '<div class="admin-message__body">' +
          '<p class="admin-message__meta">' +
          "<strong>" + escapeHtml(message.author_name) + "</strong> — " +
          formatDate(message.created_at) +
          "</p>" +
          "<p>" + escapeHtml(message.body) + "</p>" +
          "</div>" +
          '<button type="button" class="admin-listing__delete admin-message__delete" data-id="' +
          escapeAttr(message.id) +
          '">Delete</button>' +
          "</div>"
        );
      })
      .join("");
  }

  function loadMessagesForSelectedTopic() {
    var select = document.getElementById("moderation-topic-select");
    var statusEl = document.getElementById("messages-status");
    var container = document.getElementById("admin-messages");
    var topicId = select.value;

    if (!topicId) {
      statusEl.textContent = "";
      container.innerHTML = "";
      return;
    }

    statusEl.textContent = "Loading...";
    fetchJson("/api/discussion-messages?topic=" + encodeURIComponent(topicId) + "&_=" + Date.now())
      .then(function (data) {
        statusEl.textContent = "";
        renderMessages((data && data.messages) || []);
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

    function renderExistingImages() {
      existingImagesContainer.innerHTML = editKeepImages
        .map(function (path) {
          return (
            '<div class="admin-existing-image" data-path="' + escapeAttr(path) + '">' +
            '<div class="admin-existing-image__thumb" style="background-image: url(\'' +
            escapeHtml(path) +
            "')\"></div>" +
            '<button type="button" class="admin-existing-image__remove" aria-label="Remove this photo">&times;</button>' +
            "</div>"
          );
        })
        .join("");
    }

    function enterEditMode(item) {
      listingIdField.value = item.id;
      editKeepImages = itemImages(item).slice();
      document.getElementById("listing-title").value = item.title || "";
      document.getElementById("listing-description").value = item.description || "";
      document.getElementById("listing-price").value = item.price != null ? item.price : "";
      document.getElementById("listing-image").value = "";

      existingImagesRow.hidden = false;
      renderExistingImages();
      listingImageLabel.textContent = "Add more photos (optional, up to " + MAX_LISTING_IMAGES + " total)";
      listingFormHeading.textContent = "Edit listing";
      listingFormSubmit.textContent = "Save Changes";
      listingFormCancel.hidden = false;
      listingStatus.textContent = "";
      listingForm.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function exitEditMode() {
      listingIdField.value = "";
      editKeepImages = [];
      existingImagesRow.hidden = true;
      existingImagesContainer.innerHTML = "";
      listingImageLabel.textContent = "Photos * (up to " + MAX_LISTING_IMAGES + ")";
      listingFormHeading.textContent = "Add a new listing";
      listingFormSubmit.textContent = "Add Listing";
      listingFormCancel.hidden = true;
      listingForm.reset();
    }

    listingFormCancel.addEventListener("click", exitEditMode);

    existingImagesContainer.addEventListener("click", function (event) {
      var button = event.target.closest(".admin-existing-image__remove");
      if (!button) return;
      var path = button.closest(".admin-existing-image").getAttribute("data-path");
      editKeepImages = editKeepImages.filter(function (p) {
        return p !== path;
      });
      renderExistingImages();
    });

    function unlock() {
      lockSection.hidden = true;
      contentSection.hidden = false;
      loadListings();
      loadTopics();
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

      if (editingId) {
        var totalImages = editKeepImages.length + files.length;
        if (totalImages === 0) {
          listingStatus.textContent = "A listing needs at least one photo.";
          return;
        }
        if (totalImages > MAX_LISTING_IMAGES) {
          listingStatus.textContent = "A listing can have at most " + MAX_LISTING_IMAGES + " photos total.";
          return;
        }

        listingStatus.textContent = "Saving...";

        Promise.all(files.map(resizeImageFile))
          .then(function (newImageDataUrls) {
            return apiRequest("/api/jewelry-update", {
              id: editingId,
              title: title,
              description: description,
              price: price,
              keepImages: editKeepImages,
              newImageDataUrls: newImageDataUrls,
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

      if (!files.length) {
        listingStatus.textContent = "Please choose at least one photo.";
        return;
      }
      if (files.length > MAX_LISTING_IMAGES) {
        listingStatus.textContent = "Please choose at most " + MAX_LISTING_IMAGES + " photos.";
        return;
      }

      listingStatus.textContent = "Uploading...";

      Promise.all(files.map(resizeImageFile))
        .then(function (imageDataUrls) {
          return apiRequest("/api/jewelry-create", {
            title: title,
            description: description,
            price: price,
            imageDataUrls: imageDataUrls,
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

    var topicForm = document.getElementById("topic-form");
    var topicFormStatus = document.getElementById("topic-form-status");

    topicForm.addEventListener("submit", function (event) {
      event.preventDefault();
      var title = document.getElementById("topic-title").value.trim();
      var description = document.getElementById("topic-description").value.trim();

      topicFormStatus.textContent = "Adding...";
      apiRequest("/api/discussion-topic-create", { title: title, description: description })
        .then(function () {
          topicFormStatus.textContent = "Added!";
          topicForm.reset();
          loadTopics();
        })
        .catch(function (err) {
          topicFormStatus.textContent = "Error: " + err.message;
        });
    });

    document.getElementById("admin-topics").addEventListener("click", function (event) {
      var button = event.target.closest(".admin-topic__delete");
      if (!button) return;
      var id = button.getAttribute("data-id");
      if (!window.confirm("Delete this topic and all its messages?")) return;
      button.disabled = true;
      button.textContent = "Deleting...";
      apiRequest("/api/discussion-topic-delete", { id: id })
        .then(function () {
          loadTopics();
          loadMessagesForSelectedTopic();
        })
        .catch(function (err) {
          window.alert("Error: " + err.message);
          button.disabled = false;
          button.textContent = "Delete";
        });
    });

    document
      .getElementById("moderation-topic-select")
      .addEventListener("change", loadMessagesForSelectedTopic);

    document.getElementById("admin-messages").addEventListener("click", function (event) {
      var button = event.target.closest(".admin-message__delete");
      if (!button) return;
      var id = button.getAttribute("data-id");
      if (!window.confirm("Delete this message?")) return;
      button.disabled = true;
      button.textContent = "Deleting...";
      apiRequest("/api/discussion-message-delete", { id: id })
        .then(function () {
          loadMessagesForSelectedTopic();
        })
        .catch(function (err) {
          window.alert("Error: " + err.message);
          button.disabled = false;
          button.textContent = "Delete";
        });
    });
  });
})();
