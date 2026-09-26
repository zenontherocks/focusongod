// POST /api/jewelry-update
// Body: { id, title, description, price, keepImages, newImageDataUrls, keepVideos, newVideoDataUrls }
// Admin-only. Edits an existing listing's title/description/price and its
// photo set: keepImages is the subset (in order) of the listing's current
// images to retain, newImageDataUrls is a (possibly empty) array of new
// base64 data URLs to add. keepImages.length + newImageDataUrls.length must
// be between 1 and MAX_IMAGES. keepVideos/newVideoDataUrls work the same
// way for videos, except the total may be zero (videos are optional) and
// is capped at MAX_VIDEOS, with each new video capped at MAX_VIDEO_BYTES.
//
// New images/videos are uploaded (and the updated listing committed)
// before any removed ones are deleted, so a failure partway through never
// leaves the listing referencing a missing file.

import {
  DATA_PATH,
  toBase64,
  fromBase64,
  githubGetFile,
  githubPutFile,
  githubDeleteFile,
} from "../lib/github.js";
import { checkAuth, unauthorized, jsonResponse } from "../lib/http.js";

const MAX_IMAGES = 8;
const MAX_VIDEOS = 2;
// See the matching comment in jewelry-create.js for why 8MB.
const MAX_VIDEO_BYTES = 8 * 1024 * 1024;

function generateImageSuffix() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function base64ByteLength(base64) {
  const len = base64.length;
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return (len * 3) / 4 - padding;
}

export async function handleUpdate(request, env) {
  if (!checkAuth(request, env)) return unauthorized();

  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const {
    id,
    title,
    description,
    price,
    keepImages,
    newImageDataUrls,
    keepVideos,
    newVideoDataUrls,
  } = payload || {};
  if (!id || !title || price === undefined || price === null || price === "") {
    return jsonResponse({ error: "id, title, and price are required" }, 400);
  }

  const priceNumber = Number(price);
  if (!Number.isFinite(priceNumber) || priceNumber < 0) {
    return jsonResponse({ error: "price must be a non-negative number" }, 400);
  }

  const keepList = Array.isArray(keepImages) ? keepImages : [];
  const newList = Array.isArray(newImageDataUrls) ? newImageDataUrls : [];
  const totalImages = keepList.length + newList.length;
  if (totalImages === 0) {
    return jsonResponse({ error: "a listing must have at least one image" }, 400);
  }
  if (totalImages > MAX_IMAGES) {
    return jsonResponse({ error: `A listing can have at most ${MAX_IMAGES} images` }, 400);
  }

  const keepVideoList = Array.isArray(keepVideos) ? keepVideos : [];
  const newVideoList = Array.isArray(newVideoDataUrls) ? newVideoDataUrls : [];
  const totalVideos = keepVideoList.length + newVideoList.length;
  if (totalVideos > MAX_VIDEOS) {
    return jsonResponse({ error: `A listing can have at most ${MAX_VIDEOS} videos` }, 400);
  }

  const parsedNewImages = [];
  for (const imageDataUrl of newList) {
    const match = /^data:image\/(png|jpe?g|webp);base64,(.+)$/i.exec(imageDataUrl);
    if (!match) {
      return jsonResponse({ error: "each new image must be a base64 png/jpeg/webp data URL" }, 400);
    }
    const rawExt = match[1].toLowerCase();
    const ext = rawExt === "jpg" ? "jpeg" : rawExt;
    parsedNewImages.push({ ext: ext === "jpeg" ? "jpg" : ext, base64Image: match[2] });
  }

  const parsedNewVideos = [];
  for (const videoDataUrl of newVideoList) {
    const match = /^data:video\/(mp4|webm|quicktime);base64,(.+)$/i.exec(videoDataUrl);
    if (!match) {
      return jsonResponse({ error: "each new video must be a base64 mp4/webm/quicktime data URL" }, 400);
    }
    const ext = match[1].toLowerCase() === "quicktime" ? "mov" : match[1].toLowerCase();
    if (base64ByteLength(match[2]) > MAX_VIDEO_BYTES) {
      return jsonResponse({ error: `each video must be under ${MAX_VIDEO_BYTES / (1024 * 1024)}MB` }, 400);
    }
    parsedNewVideos.push({ ext, base64Video: match[2] });
  }

  try {
    const existing = await githubGetFile(env, DATA_PATH);
    if (!existing) return jsonResponse({ error: "No listings file found" }, 404);

    const currentData = JSON.parse(fromBase64(existing.content.replace(/\n/g, "")));
    const items = currentData.items || [];
    const targetIndex = items.findIndex((item) => item.id === id);
    if (targetIndex === -1) return jsonResponse({ error: "Listing not found" }, 404);
    const target = items[targetIndex];

    const currentImages =
      target.images && target.images.length ? target.images : target.image ? [target.image] : [];
    const invalidKeep = keepList.filter((path) => !currentImages.includes(path));
    if (invalidKeep.length) {
      return jsonResponse({ error: "keepImages contains images that aren't part of this listing" }, 400);
    }
    const imagesToDelete = currentImages.filter((path) => !keepList.includes(path));

    const currentVideos = target.videos && target.videos.length ? target.videos : [];
    const invalidKeepVideos = keepVideoList.filter((path) => !currentVideos.includes(path));
    if (invalidKeepVideos.length) {
      return jsonResponse({ error: "keepVideos contains videos that aren't part of this listing" }, 400);
    }
    const videosToDelete = currentVideos.filter((path) => !keepVideoList.includes(path));

    const newPaths = [];
    for (const { ext, base64Image } of parsedNewImages) {
      const imagePath = `images/jewelry/${id}-${generateImageSuffix()}.${ext}`;
      await githubPutFile(env, imagePath, base64Image, `Add jewelry listing image: ${title}`);
      newPaths.push(imagePath);
    }

    const newVideoPaths = [];
    for (const { ext, base64Video } of parsedNewVideos) {
      const videoPath = `videos/jewelry/${id}-${generateImageSuffix()}.${ext}`;
      await githubPutFile(env, videoPath, base64Video, `Add jewelry listing video: ${title}`);
      newVideoPaths.push(videoPath);
    }

    const updatedItem = {
      id: target.id,
      title: String(title).slice(0, 200),
      description: description ? String(description).slice(0, 2000) : "",
      price: priceNumber,
      images: [...keepList, ...newPaths],
      videos: [...keepVideoList, ...newVideoPaths],
      created_at: target.created_at,
    };
    items[targetIndex] = updatedItem;
    currentData.items = items;
    currentData.generated_at = new Date().toISOString();

    const newContentBase64 = toBase64(JSON.stringify(currentData, null, 2) + "\n");
    await githubPutFile(env, DATA_PATH, newContentBase64, `Update jewelry listing: ${title}`, existing.sha);

    for (const imagePath of imagesToDelete) {
      const imageFile = await githubGetFile(env, imagePath);
      if (imageFile) {
        await githubDeleteFile(env, imagePath, `Remove jewelry listing image: ${title}`, imageFile.sha);
      }
    }

    for (const videoPath of videosToDelete) {
      const videoFile = await githubGetFile(env, videoPath);
      if (videoFile) {
        await githubDeleteFile(env, videoPath, `Remove jewelry listing video: ${title}`, videoFile.sha);
      }
    }

    return jsonResponse({ ok: true, item: updatedItem });
  } catch (err) {
    return jsonResponse({ error: String((err && err.message) || err) }, 500);
  }
}
