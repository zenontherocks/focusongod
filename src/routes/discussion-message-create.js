// POST /api/discussion-message-create
// Body: { topic_id, author_name, body, website }
// Public — anyone can post, no login. "website" is a hidden honeypot field
// (see css/discussion.css): real visitors never fill it in, so a filled-in
// value means a bot and gets silently dropped rather than an error that
// would tip the bot off.

import { jsonResponse, sha256Hex } from "../lib/http.js";
import { getTopic, createMessage, msSinceLastPostByIp } from "../lib/db.js";

const MAX_NAME_LENGTH = 60;
const MAX_BODY_LENGTH = 1000;
const THROTTLE_MS = 5000;

export async function handleMessageCreate(request, env) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const { topic_id: topicId, author_name: authorName, body, website } = payload || {};

  // Honeypot: pretend success so the bot doesn't learn to look elsewhere.
  if (website) {
    return jsonResponse({ ok: true });
  }

  if (!topicId || !authorName || !body) {
    return jsonResponse({ error: "topic_id, author_name, and body are required" }, 400);
  }

  try {
    const topic = await getTopic(env, topicId);
    if (!topic) return jsonResponse({ error: "Topic not found" }, 404);

    const ip = request.headers.get("CF-Connecting-IP") || "";
    const ipHash = ip ? await sha256Hex(ip) : "";

    if (ipHash) {
      const msSinceLast = await msSinceLastPostByIp(env, ipHash);
      if (msSinceLast !== null && msSinceLast < THROTTLE_MS) {
        return jsonResponse({ error: "You're posting too quickly — please wait a moment." }, 429);
      }
    }

    const message = await createMessage(env, {
      topicId,
      authorName: String(authorName).trim().slice(0, MAX_NAME_LENGTH),
      body: String(body).trim().slice(0, MAX_BODY_LENGTH),
      ipHash,
    });

    return jsonResponse({ ok: true, message });
  } catch (err) {
    return jsonResponse({ error: String((err && err.message) || err) }, 500);
  }
}
