// Small HTTP helpers shared by every API route (jewelry and discussion
// alike) — nothing here is specific to GitHub or D1.

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

// Used to store a non-reversible fingerprint of a poster's IP (for basic
// spam throttling) instead of the raw address.
export async function sha256Hex(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
