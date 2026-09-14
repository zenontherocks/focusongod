// Tiny shared DOM-escaping helpers used anywhere user-entered text (a
// jewelry listing, a discussion message, an admin form) gets inserted
// into rendered HTML. Exposed as window.FogDomUtils since these plain
// pages don't use a module bundler.

(function () {
  function escapeHtml(value) {
    var div = document.createElement("div");
    div.textContent = value == null ? "" : value;
    return div.innerHTML;
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/"/g, "&quot;");
  }

  window.FogDomUtils = {
    escapeHtml: escapeHtml,
    escapeAttr: escapeAttr,
  };
})();
