// Drives the "Buy the Book" popup: open/close behavior, a basic focus
// trap while it's open, and the shipping form's Formspree submission
// which clicks through to the payment step inside the same modal.
// See README.md for how to set up the real Formspree endpoint.

(function () {
  document.addEventListener("DOMContentLoaded", function () {
    var openBtn = document.getElementById("open-checkout");
    var modal = document.getElementById("checkout-modal");
    if (!openBtn || !modal) return;

    var dialog = modal.querySelector(".modal__dialog");
    var closeTriggers = modal.querySelectorAll("[data-close-modal]");
    var shippingStep = document.getElementById("modal-step-shipping");
    var paymentStep = document.getElementById("modal-step-payment");
    var form = document.getElementById("shipping-form");
    var statusEl = form.querySelector(".shipping-form__status");
    var submitBtn = form.querySelector('button[type="submit"]');

    var FOCUSABLE_SELECTOR =
      'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

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

    function openModal() {
      modal.hidden = false;
      document.body.style.overflow = "hidden";
      focusFirstIn(shippingStep.hidden ? paymentStep : shippingStep);
      document.addEventListener("keydown", onKeydown);
    }

    function closeModal() {
      modal.hidden = true;
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeydown);
      openBtn.focus();
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

    openBtn.addEventListener("click", openModal);
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
