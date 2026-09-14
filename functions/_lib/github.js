// Shared helpers for committing jewelry listing changes straight to the
// site's GitHub repo via the Contents API. Used by the admin console's
// Cloudflare Pages Functions (functions/api/jewelry-*.js).
//
// Requires two Cloudflare Pages environment secrets (set in the Cloudflare
// dashboard, not in this repo): GITHUB_TOKEN (a token with contents:write on
// this repo) and ADMIN_PASSWORD (the shared password gating these endpoints).

export const OWNER = "zenontherocks";
export const REPO = "focusongod";
export const BRANCH = "main";
export const DATA_PATH = "data/jewelry-listings.json";

export function toBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

export function fromBase64(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

function githubHeaders(env) {
  return {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "focusongod-admin",
    "Content-Type": "application/json",
  };
}

export async function githubGetFile(env, path) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}?ref=${BRANCH}`;
  const res = await fetch(url, { headers: githubHeaders(env) });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`GitHub GET ${path} failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export async function githubPutFile(env, path, base64Content, message, sha) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`;
  const body = { message, content: base64Content, branch: BRANCH };
  if (sha) body.sha = sha;
  const res = await fetch(url, {
    method: "PUT",
    headers: githubHeaders(env),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`GitHub PUT ${path} failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export async function githubDeleteFile(env, path, message, sha) {
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${path}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: githubHeaders(env),
    body: JSON.stringify({ message, sha, branch: BRANCH }),
  });
  if (!res.ok) {
    throw new Error(`GitHub DELETE ${path} failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

export function checkAuth(request, env) {
  const provided = request.headers.get("X-Admin-Password") || "";
  return Boolean(env.ADMIN_PASSWORD) && provided === env.ADMIN_PASSWORD;
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
