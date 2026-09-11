// Submits the shipping form to Formspree without leaving the page, then
// reveals the payment buttons once the submission succeeds. See README.md
// for how to set up the real Formspree endpoint.

(function () {
  document.addEventListener("DOMContentLoaded", function () {
    var form = document.getElementById("shipping-form");
    if (!form) return;

    var statusEl = form.querySelector(".shipping-form__status");
    var submitBtn = form.querySelector('button[type="submit"]');
    var checkoutSection = document.getElementById("checkout-section");

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
            statusEl.textContent = "Thanks! Choose how you'd like to pay below.";
            statusEl.className = "shipping-form__status shipping-form__status--success";
            if (checkoutSection) {
              checkoutSection.hidden = false;
              checkoutSection.scrollIntoView({ behavior: "smooth", block: "start" });
            }
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
