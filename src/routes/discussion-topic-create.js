// POST /api/discussion-topic-create
// Body: { title, description }
// Admin-only — creating topics is curated, not open to visitors.

import { checkAuth, unauthorized, jsonResponse } from "../lib/http.js";
import { createTopic } from "../lib/db.js";

export async function handleTopicCreate(request, env) {
  if (!checkAuth(request, env)) return unauthorized();

  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const { title, description } = payload || {};
  if (!title) return jsonResponse({ error: "title is required" }, 400);

  try {
    const topic = await createTopic(env, String(title).trim().slice(0, 100), description ? String(description).trim().slice(0, 300) : "");
    return jsonResponse({ ok: true, topic });
  } catch (err) {
    return jsonResponse({ error: String((err && err.message) || err) }, 500);
  }
}
