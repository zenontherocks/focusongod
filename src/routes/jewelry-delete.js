// POST /api/jewelry-delete
// Body: { id }
//
// Removes the listing from data/jewelry-listings.json and deletes all of
// its image files, both directly on the `main` branch.

import {
  DATA_PATH,
  toBase64,
  fromBase64,
  githubGetFile,
  githubPutFile,
  githubDeleteFile,
} from "../lib/github.js";
import { checkAuth, unauthorized, jsonResponse } from "../lib/http.js";

export async function handleDelete(request, env) {
  if (!checkAuth(request, env)) return unauthorized();

  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const { id } = payload || {};
  if (!id) return jsonResponse({ error: "id is required" }, 400);

  try {
    const existing = await githubGetFile(env, DATA_PATH);
    if (!existing) return jsonResponse({ error: "No listings file found" }, 404);

    const currentData = JSON.parse(fromBase64(existing.content.replace(/\n/g, "")));
    const items = currentData.items || [];
    const target = items.find((item) => item.id === id);
    if (!target) return jsonResponse({ error: "Listing not found" }, 404);

    currentData.items = items.filter((item) => item.id !== id);
    currentData.generated_at = new Date().toISOString();

    const newContentBase64 = toBase64(JSON.stringify(currentData, null, 2) + "\n");
    await githubPutFile(env, DATA_PATH, newContentBase64, `Remove jewelry listing: ${target.title}`, existing.sha);

    const imagesToDelete = target.images && target.images.length ? target.images : target.image ? [target.image] : [];
    for (const imagePath of imagesToDelete) {
      const imageFile = await githubGetFile(env, imagePath);
      if (imageFile) {
        await githubDeleteFile(env, imagePath, `Remove jewelry listing image: ${target.title}`, imageFile.sha);
      }
    }

    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ error: String((err && err.message) || err) }, 500);
  }
}
