// POST /api/discussion-topic-delete
// Body: { id }
// Admin-only. Deletes a topic and every message inside it.

import { checkAuth, unauthorized, jsonResponse } from "../lib/http.js";
import { getTopic, deleteTopic } from "../lib/db.js";

export async function handleTopicDelete(request, env) {
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
    const topic = await getTopic(env, id);
    if (!topic) return jsonResponse({ error: "Topic not found" }, 404);

    await deleteTopic(env, id);
    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ error: String((err && err.message) || err) }, 500);
  }
}
