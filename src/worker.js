// Worker entry point for the focusongod site.
//
// This is a static site (served via the ASSETS binding below) with a
// handful of small API routes bolted on for the jewelry and discussion
// admin consoles. Cloudflare serves any request that matches a real
// static file directly, without even invoking this script — this
// fetch() handler only runs for requests that don't match a static
// asset (our /api/* routes, plus genuine 404s).

import { handleAuthCheck } from "./routes/jewelry-auth-check.js";
import { handleCreate } from "./routes/jewelry-create.js";
import { handleUpdate } from "./routes/jewelry-update.js";
import { handleDelete } from "./routes/jewelry-delete.js";
import { handleTopicsList } from "./routes/discussion-topics.js";
import { handleMessagesList } from "./routes/discussion-messages.js";
import { handleMessageCreate } from "./routes/discussion-message-create.js";
import { handleTopicCreate } from "./routes/discussion-topic-create.js";
import { handleTopicDelete } from "./routes/discussion-topic-delete.js";
import { handleMessageDelete } from "./routes/discussion-message-delete.js";
import { handleShippingSubmit } from "./routes/shipping-submit.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/api/jewelry-auth-check") {
      return handleAuthCheck(request, env);
    }
    if (request.method === "POST" && url.pathname === "/api/jewelry-create") {
      return handleCreate(request, env);
    }
    if (request.method === "POST" && url.pathname === "/api/jewelry-update") {
      return handleUpdate(request, env);
    }
    if (request.method === "POST" && url.pathname === "/api/jewelry-delete") {
      return handleDelete(request, env);
    }

    if (request.method === "GET" && url.pathname === "/api/discussion-topics") {
      return handleTopicsList(request, env);
    }
    if (request.method === "GET" && url.pathname === "/api/discussion-messages") {
      return handleMessagesList(request, env);
    }
    if (request.method === "POST" && url.pathname === "/api/discussion-message-create") {
      return handleMessageCreate(request, env);
    }
    if (request.method === "POST" && url.pathname === "/api/discussion-topic-create") {
      return handleTopicCreate(request, env);
    }
    if (request.method === "POST" && url.pathname === "/api/discussion-topic-delete") {
      return handleTopicDelete(request, env);
    }
    if (request.method === "POST" && url.pathname === "/api/discussion-message-delete") {
      return handleMessageDelete(request, env);
    }

    if (request.method === "POST" && url.pathname === "/api/shipping-submit") {
      return handleShippingSubmit(request, env);
    }

    // Not one of our API routes — fall back to static asset serving
    // (this mostly just re-produces the platform's own 404 for a path
    // that didn't match a real file, since assets are already tried
    // before this Worker runs at all).
    return env.ASSETS.fetch(request);
  },
};
