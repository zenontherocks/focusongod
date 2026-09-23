// Small HTTP helpers shared by every API route — nothing here is
// specific to GitHub.

export function checkAuth(request, env) {
  const provided = (request.headers.get("X-Admin-Password") || "").trim();
  const expected = (env.ADMIN_PASSWORD || "").trim();
  return Boolean(expected) && provided === expected;
}

export function jsonResponse(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { "Content-Type": "application/json" },
  });
}

export function unauthorized() {
  return jsonResponse({ error: "Unauthorized" }, 401);
}
