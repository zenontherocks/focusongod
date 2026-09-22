// POST /api/shipping-submit
// Body: multipart/form-data — whatever the shipping form posts (name,
// email, address_line_1, address_line_2, city, state, zip, note,
// _subject, _gotcha).
//
// Public. Every checkout page posts here instead of directly to
// Formspree, so the real Formspree endpoint is never present in any
// HTML/JS the browser downloads. That closes off the most common way
// this form gets spammed: scripts that scrape public sites for
// formspree.io/f/<id> URLs and blast generic templated submissions
// straight at them — bypassing this page, and the required-field
// checks the browser only ever enforced client-side, entirely. This
// route re-checks those same requirements server-side, where skipping
// the page's JS doesn't help.

import { jsonResponse } from "../lib/http.js";

const FORMSPREE_URL = "https://formspree.io/f/meaqdvbv";
const SITE_ORIGIN = "https://focusongod.win";
const MAX_FIELD_LENGTH = 300;
const MAX_NOTE_LENGTH = 2000;

function cleanField(value, maxLength) {
  return value == null ? "" : String(value).trim().slice(0, maxLength || MAX_FIELD_LENGTH);
}

export async function handleShippingSubmit(request) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return jsonResponse({ error: "Invalid form submission" }, 400);
  }

  // Honeypot: pretend success so a bot doesn't learn it was caught.
  if (cleanField(form.get("_gotcha"))) {
    return jsonResponse({ ok: true });
  }

  const name = cleanField(form.get("name"));
  const addressLine1 = cleanField(form.get("address_line_1"));
  const city = cleanField(form.get("city"));
  const state = cleanField(form.get("state"));
  const zip = cleanField(form.get("zip"));

  if (!name || !addressLine1 || !city || !state || !zip) {
    return jsonResponse({ error: "Please fill in your name and full shipping address." }, 400);
  }

  const payload = {
    name,
    email: cleanField(form.get("email")),
    address_line_1: addressLine1,
    address_line_2: cleanField(form.get("address_line_2")),
    city,
    state,
    zip,
    note: cleanField(form.get("note"), MAX_NOTE_LENGTH),
    _subject: cleanField(form.get("_subject")),
  };

  // Forward the browser's real Referer when we have one (a normal
  // same-origin fetch to this route always carries one), falling back
  // to the site's own URL. This matters because this request is now a
  // server-to-server call with no browser attached to it at all — with
  // no Referer, Formspree's "Restrict to Domain" setting (if enabled on
  // this form) treats the submission as coming from an unrecognized
  // site and quietly files it under spam instead of emailing it, while
  // still returning a normal-looking success response. That's exactly
  // how a real order went missing: the checkout flow completed fine
  // from the buyer's side, but the submission never reached the inbox.
  const referer = request.headers.get("Referer") || SITE_ORIGIN + "/";

  try {
    const res = await fetch(FORMSPREE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Referer: referer,
        Origin: SITE_ORIGIN,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      return jsonResponse({ error: "Formspree rejected the submission" }, 502);
    }
    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ error: String((err && err.message) || err) }, 500);
  }
}
