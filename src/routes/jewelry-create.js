// POST /api/jewelry-create
// Body: { title, description, price, imageDataUrls, videoDataUrls }
// A listing needs at least one image or video (either alone is fine).
// imageDataUrls is an array of base64 data URLs (image/png, image/jpeg,
// or image/webp), up to MAX_IMAGES. videoDataUrls is an array of at most
// MAX_VIDEOS (1) base64 data URLs (video/mp4, video/webm, or
// video/quicktime), capped at MAX_VIDEO_BYTES and rejected if it's
// HEVC-encoded — see src/lib/video.js for why. Capped at one video (not
// more) specifically so that cap could be a more useful 16MB instead of
// leaving room for a second one in the same request.
//
// Commits each image/video to images/jewelry/<id>-<index>.<ext> and
// appends the new item to data/jewelry-listings.json, both directly on
// the `main` branch — which then auto-deploys via this Worker's git
// integration, same as any other change to the site.

import {
  DATA_PATH,
  toBase64,
  fromBase64,
  githubGetFile,
  githubPutFile,
} from "../lib/github.js";
import { checkAuth, unauthorized, jsonResponse } from "../lib/http.js";
import { MAX_VIDEO_BYTES, parseVideoDataUrl, base64ByteLength, containsHevc } from "../lib/video.js";

const MAX_IMAGES = 8;
const MAX_VIDEOS = 1;

function parsedImage(dataUrl) {
  const match = /^data:image\/(png|jpe?g|webp);base64,(.+)$/i.exec(dataUrl);
  if (!match) return null;
  const rawExt = match[1].toLowerCase();
  const ext = rawExt === "jpg" ? "jpeg" : rawExt;
  return { ext: ext === "jpeg" ? "jpg" : ext, base64: match[2] };
}

export async function handleCreate(request, env) {
  if (!checkAuth(request, env)) return unauthorized();

  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const { title, description, price, imageDataUrls, videoDataUrls } = payload || {};
  const imageList = Array.isArray(imageDataUrls) ? imageDataUrls : [];
  const videoList = Array.isArray(videoDataUrls) ? videoDataUrls : [];
  if (!title || price === undefined || price === null || price === "") {
    return jsonResponse({ error: "title and price are required" }, 400);
  }
  if (imageList.length === 0 && videoList.length === 0) {
    return jsonResponse({ error: "a listing needs at least one image or video" }, 400);
  }
  if (imageList.length > MAX_IMAGES) {
    return jsonResponse({ error: `A listing can have at most ${MAX_IMAGES} images` }, 400);
  }
  if (videoList.length > MAX_VIDEOS) {
    return jsonResponse({ error: `A listing can have at most ${MAX_VIDEOS} videos` }, 400);
  }

  const priceNumber = Number(price);
  if (!Number.isFinite(priceNumber) || priceNumber < 0) {
    return jsonResponse({ error: "price must be a non-negative number" }, 400);
  }

  const parsedImages = [];
  for (const dataUrl of imageList) {
    const parsed = parsedImage(dataUrl);
    if (!parsed) {
      return jsonResponse({ error: "each image must be a base64 png/jpeg/webp data URL" }, 400);
    }
    parsedImages.push(parsed);
  }

  const parsedVideos = [];
  for (const dataUrl of videoList) {
    const parsed = parseVideoDataUrl(dataUrl);
    if (!parsed) {
      return jsonResponse({ error: "each video must be a base64 mp4/webm/quicktime data URL" }, 400);
    }
    if (base64ByteLength(parsed.base64) > MAX_VIDEO_BYTES) {
      return jsonResponse({ error: `each video must be under ${MAX_VIDEO_BYTES / (1024 * 1024)}MB` }, 400);
    }
    if (containsHevc(parsed.base64)) {
      return jsonResponse(
        {
          error:
            "That video is HEVC/H.265-encoded, which most browsers besides Safari can't play. " +
            'On iPhone: Settings → Camera → Formats → "Most Compatible", then re-record or re-export and try again.',
        },
        400
      );
    }
    parsedVideos.push(parsed);
  }

  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  try {
    const imagePaths = [];
    for (let i = 0; i < parsedImages.length; i++) {
      const { ext, base64 } = parsedImages[i];
      const imagePath = `images/jewelry/${id}-${i}.${ext}`;
      await githubPutFile(env, imagePath, base64, `Add jewelry listing image: ${title}`);
      imagePaths.push(imagePath);
    }

    const videoPaths = [];
    for (let i = 0; i < parsedVideos.length; i++) {
      const { ext, base64 } = parsedVideos[i];
      const videoPath = `videos/jewelry/${id}-${i}.${ext}`;
      await githubPutFile(env, videoPath, base64, `Add jewelry listing video: ${title}`);
      videoPaths.push(videoPath);
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
      videos: videoPaths,
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
