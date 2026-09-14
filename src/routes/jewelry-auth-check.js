// POST /api/jewelry-auth-check
// Body: {} — just validates the X-Admin-Password header.
// Used by the admin console to verify a password without touching GitHub.

import { checkAuth, unauthorized, jsonResponse } from "../lib/github.js";

export async function handleAuthCheck(request, env) {
  if (!checkAuth(request, env)) return unauthorized();
  return jsonResponse({ ok: true });
}
