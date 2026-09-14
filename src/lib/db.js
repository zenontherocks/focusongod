// D1 query helpers for the Discussion page (topics + messages), bound to
// the Worker as env.DB — see wrangler.jsonc's d1_databases entry and
// db/schema.sql for the one-time table setup.

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export async function listTopics(env) {
  const { results } = await env.DB.prepare(
    "SELECT id, title, description, created_at FROM topics ORDER BY created_at ASC"
  ).all();
  return results;
}

export async function getTopic(env, id) {
  return env.DB.prepare("SELECT id, title, description, created_at FROM topics WHERE id = ?")
    .bind(id)
    .first();
}

export async function createTopic(env, title, description) {
  const topic = {
    id: generateId(),
    title,
    description: description || "",
    created_at: new Date().toISOString(),
  };
  await env.DB.prepare(
    "INSERT INTO topics (id, title, description, created_at) VALUES (?, ?, ?, ?)"
  )
    .bind(topic.id, topic.title, topic.description, topic.created_at)
    .run();
  return topic;
}

export async function deleteTopic(env, id) {
  await env.DB.batch([
    env.DB.prepare("DELETE FROM messages WHERE topic_id = ?").bind(id),
    env.DB.prepare("DELETE FROM topics WHERE id = ?").bind(id),
  ]);
}

export async function listMessages(env, topicId) {
  const { results } = await env.DB.prepare(
    "SELECT id, topic_id, author_name, body, created_at FROM messages WHERE topic_id = ? ORDER BY created_at ASC"
  )
    .bind(topicId)
    .all();
  return results;
}

export async function createMessage(env, { topicId, authorName, body, ipHash }) {
  const message = {
    id: generateId(),
    topic_id: topicId,
    author_name: authorName,
    body,
    ip_hash: ipHash || "",
    created_at: new Date().toISOString(),
  };
  await env.DB.prepare(
    "INSERT INTO messages (id, topic_id, author_name, body, ip_hash, created_at) VALUES (?, ?, ?, ?, ?, ?)"
  )
    .bind(message.id, message.topic_id, message.author_name, message.body, message.ip_hash, message.created_at)
    .run();
  return message;
}

export async function deleteMessage(env, id) {
  await env.DB.prepare("DELETE FROM messages WHERE id = ?").bind(id).run();
}

// Returns milliseconds since this IP's most recent message, or null if it
// hasn't posted before — used for the light per-IP throttle on message
// creation.
export async function msSinceLastPostByIp(env, ipHash) {
  if (!ipHash) return null;
  const row = await env.DB.prepare(
    "SELECT created_at FROM messages WHERE ip_hash = ? ORDER BY created_at DESC LIMIT 1"
  )
    .bind(ipHash)
    .first();
  if (!row) return null;
  return Date.now() - new Date(row.created_at).getTime();
}
