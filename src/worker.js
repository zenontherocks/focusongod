// Worker entry point for the focusongod site.
//
// This is a static site (served via the ASSETS binding below) with three
// small API routes bolted on for the jewelry admin console. Cloudflare
// serves any request that matches a real static file directly, without
// even invoking this script — this fetch() handler only runs for requests
// that don't match a static asset (our /api/* routes, plus genuine 404s).

import { handleAuthCheck } from "./routes/jewelry-auth-check.js";
import { handleCreate } from "./routes/jewelry-create.js";
import { handleDelete } from "./routes/jewelry-delete.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/api/jewelry-auth-check") {
      return handleAuthCheck(request, env);
    }
    if (request.method === "POST" && url.pathname === "/api/jewelry-create") {
      return handleCreate(request, env);
    }
    if (request.method === "POST" && url.pathname === "/api/jewelry-delete") {
      return handleDelete(request, env);
    }

    // Not one of our API routes — fall back to static asset serving
    // (this mostly just re-produces the platform's own 404 for a path
    // that didn't match a real file, since assets are already tried
    // before this Worker runs at all).
    return env.ASSETS.fetch(request);
  },
};
