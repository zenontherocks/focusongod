// Drives the Discussion page: loads admin-curated topics, shows one
// flat message feed per topic, and lets anyone post after typing a
// display name (no login — just self-identification). Polls the active
// topic's messages periodically so it feels reasonably live without a
// websocket. Talks to the Cloudflare Worker routes under
// src/routes/discussion-*.js.

(function () {
  var escapeHtml = window.FogDomUtils.escapeHtml;
  var NAME_KEY = "fog_discussion_name";
  var POLL_INTERVAL_MS = 8000;

  var activeTopicId = null;
  var pollTimer = null;

  function getStoredName() {
    try {
      return localStorage.getItem(NAME_KEY) || "";
    } catch (e) {
      return "";
    }
  }

  function setStoredName(value) {
    try {
      localStorage.setItem(NAME_KEY, value);
    } catch (e) {
      // ignore (private browsing etc.)
    }
  }

  function formatDate(isoString) {
    var date = new Date(isoString);
    return isNaN(date.getTime()) ? "" : date.toLocaleString();
  }

  function fetchJson(path) {
    return fetch(path).then(function (response) {
      return response.json().then(function (data) {
        if (!response.ok) throw new Error((data && data.error) || "Request failed");
        return data;
      });
    });
  }

  function renderTopicButtons(topics, container, onSelect) {
    container.innerHTML = topics
      .map(function (topic) {
        var activeClass = topic.id === activeTopicId ? " discussion-topics__button--active" : "";
        return (
          '<button type="button" class="discussion-topics__button' +
          activeClass +
          '" data-id="' +
          escapeHtml(topic.id) +
          '">' +
          escapeHtml(topic.title) +
          "</button>"
        );
      })
      .join("");

    Array.prototype.forEach.call(container.querySelectorAll("button"), function (btn) {
      btn.addEventListener("click", function () {
        onSelect(btn.getAttribute("data-id"));
      });
    });
  }

  function renderMessages(messages, container) {
    if (!messages.length) {
      container.innerHTML = '<p class="discussion-empty">No messages yet — be the first to post!</p>';
      return;
    }
    container.innerHTML = messages
      .map(function (message) {
        return (
          '<div class="discussion-message">' +
          '<p class="discussion-message__meta">' +
          "<strong>" +
          escapeHtml(message.author_name) +
          "</strong> — " +
          formatDate(message.created_at) +
          "</p>" +
          '<p class="discussion-message__body">' +
          escapeHtml(message.body) +
          "</p>" +
          "</div>"
        );
      })
      .join("");
  }

  document.addEventListener("DOMContentLoaded", function () {
    var topicsContainer = document.getElementById("discussion-topics");
    var feedSection = document.getElementById("discussion-feed-section");
    var topicTitleEl = document.getElementById("discussion-topic-title");
    var topicDescriptionEl = document.getElementById("discussion-topic-description");
    var messagesContainer = document.getElementById("discussion-messages");
    var emptyEl = document.getElementById("discussion-empty");
    var postForm = document.getElementById("discussion-post-form");
    var postStatus = document.getElementById("discussion-post-status");
    var nameInput = document.getElementById("discussion-name");
    var messageInput = document.getElementById("discussion-message");
    var websiteInput = document.getElementById("discussion-website");

    if (!topicsContainer) return;

    nameInput.value = getStoredName();

    var currentTopics = [];

    function stopPolling() {
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
    }

    function loadMessages() {
      if (!activeTopicId) return;
      fetchJson("/api/discussion-messages?topic=" + encodeURIComponent(activeTopicId) + "&_=" + Date.now())
        .then(function (data) {
          renderMessages((data && data.messages) || [], messagesContainer);
        })
        .catch(function () {
          messagesContainer.innerHTML = '<p class="discussion-empty">Couldn\'t load messages right now.</p>';
        });
    }

    function selectTopic(topicId) {
      activeTopicId = topicId;
      var topic = currentTopics.filter(function (t) {
        return t.id === topicId;
      })[0];
      if (!topic) return;

      topicTitleEl.textContent = topic.title;
      topicDescriptionEl.textContent = topic.description || "";
      feedSection.hidden = false;
      renderTopicButtons(currentTopics, topicsContainer, selectTopic);
      messagesContainer.innerHTML = '<p class="discussion-loading">Loading messages…</p>';
      loadMessages();

      stopPolling();
      pollTimer = setInterval(loadMessages, POLL_INTERVAL_MS);
    }

    function loadTopics() {
      fetchJson("/api/discussion-topics")
        .then(function (data) {
          currentTopics = (data && data.topics) || [];
          if (!currentTopics.length) {
            topicsContainer.innerHTML = "";
            feedSection.hidden = true;
            emptyEl.hidden = false;
            return;
          }
          emptyEl.hidden = true;
          renderTopicButtons(currentTopics, topicsContainer, selectTopic);
          if (!activeTopicId || !currentTopics.some(function (t) { return t.id === activeTopicId; })) {
            selectTopic(currentTopics[0].id);
          }
        })
        .catch(function () {
          topicsContainer.innerHTML = '<p class="discussion-empty">Couldn\'t load topics right now.</p>';
        });
    }

    postForm.addEventListener("submit", function (event) {
      event.preventDefault();
      if (!activeTopicId) return;

      var name = nameInput.value.trim();
      var body = messageInput.value.trim();
      if (!name || !body) return;

      setStoredName(name);
      postStatus.textContent = "Posting...";

      fetch("/api/discussion-message-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic_id: activeTopicId,
          author_name: name,
          body: body,
          website: websiteInput.value,
        }),
      })
        .then(function (response) {
          return response.json().then(function (data) {
            if (!response.ok) throw new Error((data && data.error) || "Could not post your message.");
            return data;
          });
        })
        .then(function () {
          postStatus.textContent = "";
          messageInput.value = "";
          loadMessages();
        })
        .catch(function (err) {
          postStatus.textContent = err.message;
        });
    });

    loadTopics();
  });
})();
