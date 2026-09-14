-- One-time setup for the Discussion page's D1 database.
-- Run this once via the Cloudflare dashboard's D1 query console (or
-- `wrangler d1 execute <name> --file=db/schema.sql` locally/remotely)
-- after creating the database and adding its binding to wrangler.jsonc.
-- See README.md's "Discussion page" section for the full setup steps.

CREATE TABLE IF NOT EXISTS topics (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  topic_id TEXT NOT NULL REFERENCES topics(id),
  author_name TEXT NOT NULL,
  body TEXT NOT NULL,
  ip_hash TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_topic_id ON messages(topic_id);
