// GET /api/discussion-topics
// Public. Lists every discussion topic (curated via admin.html).

import { jsonResponse } from "../lib/http.js";
import { listTopics } from "../lib/db.js";

export async function handleTopicsList(request, env) {
  try {
    const topics = await listTopics(env);
    return jsonResponse({ topics });
  } catch (err) {
    return jsonResponse({ error: String((err && err.message) || err) }, 500);
  }
}
