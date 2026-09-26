// Shared helpers for validating videos uploaded to jewelry listings, used
// by both src/routes/jewelry-create.js and src/routes/jewelry-update.js.

// Cloudflare Workers have a hard 128MB memory ceiling, and base64 already
// inflates a file by ~33% before it's even parsed out of the request
// JSON — a single ~20MB video has been enough to crash a Worker in
// practice once you account for the JSON parse, the substring holding
// just that video's data, and re-serializing it into the GitHub PUT
// body all being resident at once. 8MB keeps real headroom under that.
export const MAX_VIDEO_BYTES = 8 * 1024 * 1024;

export function parseVideoDataUrl(dataUrl) {
  const match = /^data:video\/(mp4|webm|quicktime);base64,(.+)$/i.exec(dataUrl);
  if (!match) return null;
  const ext = match[1].toLowerCase() === "quicktime" ? "mov" : match[1].toLowerCase();
  return { ext, base64: match[2] };
}

// Base64 encodes 3 raw bytes as 4 characters, so this is an exact size
// check without ever decoding the string into actual bytes.
export function base64ByteLength(base64) {
  const len = base64.length;
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return (len * 3) / 4 - padding;
}

// iPhones default to recording HEVC (H.265), which every major browser
// except Safari fails to decode at all — playback doesn't degrade, it
// just silently fails ("No video with supported format and MIME type
// found"). This site has no build tooling to transcode video, so the
// least-bad option is to reject an HEVC upload here with a clear
// explanation rather than commit an 8MB file most visitors can't watch.
// HEVC/H.265 tracks inside an MP4 container are tagged with an "hvc1"
// or "hev1" fourcc in the stsd box — cheap and reliable to grep for
// directly in the decoded bytes without parsing the box structure.
const HEVC_FOURCCS = ["hvc1", "hev1"];

export function containsHevc(base64) {
  const binary = atob(base64);
  return HEVC_FOURCCS.some((fourcc) => binary.includes(fourcc));
}
