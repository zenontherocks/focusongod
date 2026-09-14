// POST /api/jewelry-auth-check
// Body: {} — just validates the X-Admin-Password header.
// Used by the admin console to verify a password without touching GitHub.

import { checkAuth, unauthorized, jsonResponse } from "../_lib/github.js";

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!checkAuth(request, env)) return unauthorized();
  return jsonResponse({ ok: true });
}
