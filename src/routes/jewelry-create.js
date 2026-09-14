// POST /api/jewelry-create
// Body: { title, description, price, imageDataUrl }
// imageDataUrl must be a base64 data URL (image/png, image/jpeg, or image/webp).
//
// Commits the image to images/jewelry/<id>.<ext> and appends the new item to
// data/jewelry-listings.json, both directly on the `main` branch — which
// then auto-deploys via this Worker's git integration, same as any other
// change to the site.

import {
  DATA_PATH,
  toBase64,
  fromBase64,
  githubGetFile,
  githubPutFile,
  checkAuth,
  unauthorized,
  jsonResponse,
} from "../lib/github.js";

export async function handleCreate(request, env) {
  if (!checkAuth(request, env)) return unauthorized();

  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const { title, description, price, imageDataUrl } = payload || {};
  if (!title || !imageDataUrl || price === undefined || price === null || price === "") {
    return jsonResponse({ error: "title, price, and imageDataUrl are required" }, 400);
  }

  const priceNumber = Number(price);
  if (!Number.isFinite(priceNumber) || priceNumber < 0) {
    return jsonResponse({ error: "price must be a non-negative number" }, 400);
  }

  const match = /^data:image\/(png|jpe?g|webp);base64,(.+)$/i.exec(imageDataUrl);
  if (!match) {
    return jsonResponse({ error: "imageDataUrl must be a base64 png/jpeg/webp data URL" }, 400);
  }
  const rawExt = match[1].toLowerCase();
  const ext = rawExt === "jpg" ? "jpeg" : rawExt;
  const base64Image = match[2];

  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const imagePath = `images/jewelry/${id}.${ext === "jpeg" ? "jpg" : ext}`;

  try {
    await githubPutFile(env, imagePath, base64Image, `Add jewelry listing image: ${title}`);

    const existing = await githubGetFile(env, DATA_PATH);
    const currentData = existing
      ? JSON.parse(fromBase64(existing.content.replace(/\n/g, "")))
      : { items: [] };

    const newItem = {
      id,
      title: String(title).slice(0, 200),
      description: description ? String(description).slice(0, 2000) : "",
      price: priceNumber,
      image: imagePath,
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
