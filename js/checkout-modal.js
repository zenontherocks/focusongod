// Drives every page's "Buy" popup: open/close behavior, a basic focus
// trap while it's open, and the shipping form's Formspree submission
// which clicks through to the payment step inside the same modal.
//
// Shared by every page that sells something (book, dog treats, and
// each jewelry listing): each page provides one `#checkout-modal` and
// any number of `.buy-button` elements. A button's data-item-* attributes
// tell the modal what to show when it's clicked:
//   data-item-title    (required) — used in the order subject
//   data-item-price    (required) — plain number string, e.g. "34.95"
//   data-item-subject  (required) — text for the shipping form's hidden
//                                    _subject field, so Formspree emails
//                                    arrive labeled with what was ordered
//   data-item-heading  (optional) — payment-step heading prefix, defaults
//                                    to "Complete Your Purchase"
//
// See README.md for how to set up the real Formspree endpoint.

(function () {
  var CASHAPP_HANDLE = "$FocusonGod4ever";
  var PAYPAL_HANDLE = "focusingongod";
  var VENMO_HANDLE = "irishjam7";
  var DEFAULT_HEADING = "Complete Your Purchase";

  document.addEventListener("DOMContentLoaded", function () {
    var modal = document.getElementById("checkout-modal");
    if (!modal) return;

    var dialog = modal.querySelector(".modal__dialog");
    var closeTriggers = modal.querySelectorAll("[data-close-modal]");
    var shippingStep = document.getElementById("modal-step-shipping");
    var paymentStep = document.getElementById("modal-step-payment");
    var paymentHeading = document.getElementById("modal-payment-heading");
    var subjectField = document.getElementById("shipping-form-subject");
    var cashappLink = document.getElementById("pay-cashapp");
    var paypalLink = document.getElementById("pay-paypal");
    var venmoLink = document.getElementById("pay-venmo");
    var form = document.getElementById("shipping-form");
    var statusEl = form.querySelector(".shipping-form__status");
    var submitBtn = form.querySelector('button[type="submit"]');
    var openerButton = null;

    // input:not([tabindex="-1"]) also excludes the shipping form's hidden
    // honeypot field (type="text" but tabindex="-1") from ever receiving
    // keyboard focus — same reasoning as excluding type="hidden" fields.
    var FOCUSABLE_SELECTOR =
      'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]):not([tabindex="-1"]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    function focusableElements() {
      return dialog.querySelectorAll(FOCUSABLE_SELECTOR);
    }

    function focusFirstIn(container) {
      var focusable = container.querySelector(FOCUSABLE_SELECTOR);
      if (focusable) {
        focusable.focus();
      } else {
        var all = focusableElements();
        if (all.length) all[0].focus();
      }
    }

    function setPaymentDetails(button) {
      var title = button.getAttribute("data-item-title") || "";
      var price = button.getAttribute("data-item-price") || "0";
      var subject = button.getAttribute("data-item-subject") || "New order: " + title;
      var heading = button.getAttribute("data-item-heading") || DEFAULT_HEADING;
      var amount = (Number(price) || 0).toFixed(2);

      subjectField.value = subject;
      paymentHeading.textContent = heading + " — $" + amount;
      cashappLink.href = "https://cash.app/" + CASHAPP_HANDLE + "/" + amount;
      paypalLink.href = "https://paypal.me/" + PAYPAL_HANDLE + "/" + amount;
      venmoLink.href =
        "https://venmo.com/u/" +
        VENMO_HANDLE +
        "?txn=pay&amount=" +
        amount +
        "&note=" +
        encodeURIComponent(title);
    }

    function openModal(button) {
      openerButton = button;
      form.reset();
      setPaymentDetails(button);
      shippingStep.hidden = false;
      paymentStep.hidden = true;
      statusEl.textContent = "";
      statusEl.className = "shipping-form__status";
      submitBtn.disabled = false;

      modal.hidden = false;
      document.body.style.overflow = "hidden";
      focusFirstIn(shippingStep);
      document.addEventListener("keydown", onKeydown);
    }

    function closeModal() {
      modal.hidden = true;
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeydown);
      if (openerButton) openerButton.focus();
    }

    function onKeydown(event) {
      if (event.key === "Escape") {
        closeModal();
        return;
      }
      if (event.key !== "Tab") return;

      var focusables = focusableElements();
      if (!focusables.length) return;
      var first = focusables[0];
      var last = focusables[focusables.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("click", function (event) {
      var button = event.target.closest(".buy-button");
      if (button) openModal(button);
    });

    closeTriggers.forEach(function (trigger) {
      trigger.addEventListener("click", closeModal);
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      statusEl.textContent = "Sending...";
      statusEl.className = "shipping-form__status";
      submitBtn.disabled = true;

      fetch(form.action, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: new FormData(form)
      })
        .then(function (response) {
          if (response.ok) {
            shippingStep.hidden = true;
            paymentStep.hidden = false;
            focusFirstIn(paymentStep);
          } else {
            throw new Error("Form submission failed");
          }
        })
        .catch(function () {
          statusEl.textContent =
            "Something went wrong sending your info. Please try again or email us directly.";
          statusEl.className = "shipping-form__status shipping-form__status--error";
          submitBtn.disabled = false;
        });
    });
  });
})();
