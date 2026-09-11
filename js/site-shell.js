// Injects the shared navbar and footer into every page.
// Each page needs a <div id="site-navbar"></div> and <div id="site-footer"></div>,
// plus <body data-page="..."> so the matching nav link gets highlighted.
// Edit the markup below to change the navbar/footer everywhere at once.

(function () {
  var links = [
    { page: "home", href: "index.html", label: "Home" },
    { page: "book", href: "book.html", label: "Book" },
    { page: "jewelry", href: "jewelry.html", label: "Jewelry" },
    { page: "dog-treats", href: "dog-treats.html", label: "Dog Treats" },
    { page: "discussion", href: "discussion.html", label: "Discussion" }
  ];

  function renderNavbar(currentPage) {
    var linkItems = links
      .map(function (link) {
        var activeClass = link.page === currentPage ? " active" : "";
        return (
          '<li><a class="' +
          activeClass.trim() +
          '" href="' +
          link.href +
          '">' +
          link.label +
          "</a></li>"
        );
      })
      .join("");

    return (
      '<nav class="navbar">' +
      '<div class="navbar__inner">' +
      '<a class="navbar__brand" href="index.html">Focus On God</a>' +
      '<ul class="navbar__links">' +
      linkItems +
      "</ul>" +
      "</div>" +
      "</nav>"
    );
  }

  function renderFooter() {
    var year = new Date().getFullYear();
    return (
      '<footer class="site-footer">' +
      "<p>&copy; " +
      year +
      " Focus On God. All rights reserved.</p>" +
      "</footer>"
    );
  }

  document.addEventListener("DOMContentLoaded", function () {
    var currentPage = document.body.getAttribute("data-page") || "";

    var navbarSlot = document.getElementById("site-navbar");
    if (navbarSlot) {
      navbarSlot.innerHTML = renderNavbar(currentPage);
    }

    var footerSlot = document.getElementById("site-footer");
    if (footerSlot) {
      footerSlot.innerHTML = renderFooter();
    }
  });
})();
