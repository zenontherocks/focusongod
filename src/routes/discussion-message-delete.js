// POST /api/discussion-message-delete
// Body: { id }
// Admin-only — this is the moderation control for individual messages.

import { checkAuth, unauthorized, jsonResponse } from "../lib/http.js";
import { deleteMessage } from "../lib/db.js";

export async function handleMessageDelete(request, env) {
  if (!checkAuth(request, env)) return unauthorized();

  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const { id } = payload || {};
  if (!id) return jsonResponse({ error: "id is required" }, 400);

  try {
    await deleteMessage(env, id);
    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ error: String((err && err.message) || err) }, 500);
  }
}
