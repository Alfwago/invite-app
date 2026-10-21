/** Picking and labelling message pictures (1.8.0, owner 2026-10-21: an
 *  animated GIF from the photo library must stay animated).
 *
 *  expo-image-picker below quality 1 re-encodes: on Android a GIF becomes a
 *  still; on iOS it stays animated but re-encoding every frame took ~30 s for
 *  a 200-frame GIF (simulator, 2026-10-21). At 1 both hand over the original
 *  file at once. The server shrinks still photos on arrival (image_utils). */

export function pickQuality(_os: string): number {
  return 1;
}

/** The MIME type to send for a picked file, from its name. */
export function imageMimeType(name: string): string {
  const ext = name.split("?")[0].split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "gif") return "image/gif";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}
