// POST /api/jewelry-auth-check
// Body: {} — just validates the X-Admin-Password header.
// Used by the admin console to verify a password without touching GitHub.
//
// On a mismatch this returns character *lengths* only (never the actual
// values) as a debugging aid - enough to tell a copy/paste artifact
// (extra/missing characters) apart from a genuine typo, without exposing
// the password itself.

import { jsonResponse } from "../lib/github.js";

export async function handleAuthCheck(request, env) {
  const provided = (request.headers.get("X-Admin-Password") || "").trim();
  const expected = (env.ADMIN_PASSWORD || "").trim();

  if (!expected) {
    return jsonResponse({ error: "ADMIN_PASSWORD is not set on the server." }, 500);
  }

  if (provided !== expected) {
    return jsonResponse(
      {
        error: "Unauthorized",
        debug: { providedLength: provided.length, expectedLength: expected.length },
      },
      401
    );
  }

  return jsonResponse({ ok: true });
}
