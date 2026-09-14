// GET /api/discussion-messages?topic=<id>
// Public. Lists every message in one topic, oldest first.

import { jsonResponse } from "../lib/http.js";
import { getTopic, listMessages } from "../lib/db.js";

export async function handleMessagesList(request, env) {
  const url = new URL(request.url);
  const topicId = url.searchParams.get("topic");
  if (!topicId) return jsonResponse({ error: "topic query param is required" }, 400);

  try {
    const topic = await getTopic(env, topicId);
    if (!topic) return jsonResponse({ error: "Topic not found" }, 404);

    const messages = await listMessages(env, topicId);
    return jsonResponse({ messages });
  } catch (err) {
    return jsonResponse({ error: String((err && err.message) || err) }, 500);
  }
}
