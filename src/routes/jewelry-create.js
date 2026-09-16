// POST /api/jewelry-create
// Body: { title, description, price, imageDataUrls }
// imageDataUrls must be a non-empty array of base64 data URLs (image/png,
// image/jpeg, or image/webp) — one listing can have several photos.
//
// Commits each image to images/jewelry/<id>-<index>.<ext> and appends the
// new item to data/jewelry-listings.json, both directly on the `main`
// branch — which then auto-deploys via this Worker's git integration, same
// as any other change to the site.

import {
  DATA_PATH,
  toBase64,
  fromBase64,
  githubGetFile,
  githubPutFile,
} from "../lib/github.js";
import { checkAuth, unauthorized, jsonResponse } from "../lib/http.js";

const MAX_IMAGES = 8;

export async function handleCreate(request, env) {
  if (!checkAuth(request, env)) return unauthorized();

  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const { title, description, price, imageDataUrls } = payload || {};
  if (
    !title ||
    !Array.isArray(imageDataUrls) ||
    imageDataUrls.length === 0 ||
    price === undefined ||
    price === null ||
    price === ""
  ) {
    return jsonResponse({ error: "title, price, and at least one imageDataUrl are required" }, 400);
  }
  if (imageDataUrls.length > MAX_IMAGES) {
    return jsonResponse({ error: `A listing can have at most ${MAX_IMAGES} images` }, 400);
  }

  const priceNumber = Number(price);
  if (!Number.isFinite(priceNumber) || priceNumber < 0) {
    return jsonResponse({ error: "price must be a non-negative number" }, 400);
  }

  const parsedImages = [];
  for (const imageDataUrl of imageDataUrls) {
    const match = /^data:image\/(png|jpe?g|webp);base64,(.+)$/i.exec(imageDataUrl);
    if (!match) {
      return jsonResponse({ error: "each image must be a base64 png/jpeg/webp data URL" }, 400);
    }
    const rawExt = match[1].toLowerCase();
    const ext = rawExt === "jpg" ? "jpeg" : rawExt;
    parsedImages.push({ ext: ext === "jpeg" ? "jpg" : ext, base64Image: match[2] });
  }

  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  try {
    const imagePaths = [];
    for (let i = 0; i < parsedImages.length; i++) {
      const { ext, base64Image } = parsedImages[i];
      const imagePath = `images/jewelry/${id}-${i}.${ext}`;
      await githubPutFile(env, imagePath, base64Image, `Add jewelry listing image: ${title}`);
      imagePaths.push(imagePath);
    }

    const existing = await githubGetFile(env, DATA_PATH);
    const currentData = existing
      ? JSON.parse(fromBase64(existing.content.replace(/\n/g, "")))
      : { items: [] };

    const newItem = {
      id,
      title: String(title).slice(0, 200),
      description: description ? String(description).slice(0, 2000) : "",
      price: priceNumber,
      images: imagePaths,
      created_at: new Date().toISOString(),
    };
    currentData.items = [newItem, ...(currentData.items || [])];
    currentData.generated_at = new Date().toISOString();

    const newContentBase64 = toBase64(JSON.stringify(currentData, null, 2) + "\n");
    await githubPutFile(
      env,
      DATA_PATH,
      newContentBase64,
      `Add jewelry listing: ${title}`,
      existing ? existing.sha : undefined
    );

    return jsonResponse({ ok: true, item: newItem });
  } catch (err) {
    return jsonResponse({ error: String((err && err.message) || err) }, 500);
  }
}
