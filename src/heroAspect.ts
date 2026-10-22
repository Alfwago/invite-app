// The Home hero fills the screen width and takes its height from the
// picture's own shape (owner 2026-10-21: "prioritize on width"), so a wide
// 1068x231 hero isn't cropped at the sides and a 1083x359 one isn't cropped
// top and bottom.

/** The bundled hero is 740x153. */
export const DEFAULT_HERO_ASPECT = 740 / 153;

/** width / height from a loaded picture, else ``fallback``. Clamped so an
 *  odd upload can't make the banner a sliver or a poster. */
export function heroAspect(
  size: { width?: number; height?: number } | null | undefined,
  fallback: number = DEFAULT_HERO_ASPECT,
): number {
  const w = size?.width ?? 0;
  const h = size?.height ?? 0;
  if (!(w > 0) || !(h > 0)) return fallback;
  return Math.min(8, Math.max(1.5, w / h));
}
