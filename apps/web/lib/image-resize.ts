/**
 * Downscale + re-encode an image to JPEG in the browser before upload. Fixes the
 * two common avatar/banner upload failures:
 *   - phone photos blow past the server size limit (10+ MB) → resized to a few hundred KB
 *   - iPhone HEIC files upload but won't render in most browsers → re-encoded to JPEG
 *
 * `imageOrientation: "from-image"` bakes in EXIF rotation so portrait phone shots
 * aren't sideways. If the browser can't decode the file (e.g. HEIC on a desktop
 * Chrome without support), we return the original so the upload can still try.
 */
export async function downscaleToJpeg(file: File, maxDim = 1024, quality = 0.85): Promise<Blob> {
  if (typeof createImageBitmap !== "function" || !file.type.startsWith("image/")) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file; // undecodable format → let the server try the raw bytes
  }

  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality),
  );
  return blob ?? file;
}
