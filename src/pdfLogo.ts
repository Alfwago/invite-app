// The team sheet PDF's logo (owner 2026-10-15, 2a A / 2c A) — pure logic,
// no React Native imports, so it runs under `npm test`.
//
// expo-print doesn't reliably wait for remote <img> URLs, so the app fetches
// the image first and embeds it as a base64 data URI. Which image: the
// server's `header_image_url` (0.36.0+: event upload → night upload → night
// logo → default — the invite email's art), then the old guess from the
// event name (older servers), then the OBH default header.

export type LogoEvent = { display_name?: string; header_image_url?: string | null } | undefined;

/** Gold for the "Gold" heading on white paper (#b8860b, darker than the UI gold). */
export const PDF_GOLD = "#b8860b";

/** Give an http:// URL https when the API itself is https: iOS blocks
 *  plain http, and TEST (server ≤ build 98) handed out http:// header URLs. */
export function secureUrl(url: string, apiBase: string): string {
  if (/^https:\/\//i.test(apiBase) && /^http:\/\//i.test(url)) return `https://${url.slice("http://".length)}`;
  return url;
}

/** URLs to try, best first, without duplicates. */
export function pdfLogoCandidates(evt: LogoEvent, apiBase: string): string[] {
  const out: string[] = [];
  const add = (u: string | null | undefined) => {
    if (!u) return;
    const url = secureUrl(u, apiBase);
    if (!out.includes(url)) out.push(url);
  };
  add(evt?.header_image_url ?? null);
  const first = (evt?.display_name ?? "").trim().split(/\s+/)[0]?.replace(/[^a-zA-Z0-9_-]/g, "");
  if (first) add(`${apiBase}/static/invitations/${first}.png`);
  add(`${apiBase}/static/invitations/HeaderImage.png`);
  return out;
}

/** Image MIME type from a fetched blob's type, else the URL's extension. */
export function imageMime(blobType: string | undefined, url: string): string | null {
  if (blobType && blobType.startsWith("image/")) return blobType;
  const ext = url.split("?")[0].split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "gif") return "image/gif";
  if (ext === "webp") return "image/webp";
  return null;
}

/** A FileReader data URL may come back as application/octet-stream; give it
 *  the image type so WebKit renders it. Returns null for non-images. */
export function asImageDataUri(dataUrl: string, mime: string | null): string | null {
  const m = /^data:([^;,]*)(;base64)?,(.*)$/s.exec(dataUrl);
  if (!m || !m[2] || !m[3]) return null;
  const type = m[1].startsWith("image/") ? m[1] : mime;
  if (!type) return null;
  return `data:${type};base64,${m[3]}`;
}

/** How long one logo download may take before the next candidate is tried. */
export const PDF_LOGO_TIMEOUT_MS = 5000;

/** The first candidate ``load`` turns into an image data URI within
 *  ``timeoutMs`` — "" when none does. ``load`` returns "" (or throws) for a
 *  failure; ``warn`` hears about each one (dev builds log it). */
export async function firstLogo(
  urls: string[],
  load: (url: string, signal?: AbortSignal) => Promise<string>,
  opts: { timeoutMs?: number; warn?: (msg: string) => void } = {},
): Promise<string> {
  const timeoutMs = opts.timeoutMs ?? PDF_LOGO_TIMEOUT_MS;
  for (const url of urls) {
    const ctl = typeof AbortController !== "undefined" ? new AbortController() : undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let timedOut = false;
    try {
      const timeout = new Promise<string>((resolve) => {
        timer = setTimeout(() => {
          timedOut = true; // before abort(): whatever the aborted load returns is ignored
          resolve("");
          ctl?.abort();
          opts.warn?.(`PDF logo: timed out after ${timeoutMs} ms: ${url}`);
        }, timeoutMs);
      });
      const uri = await Promise.race([load(url, ctl?.signal), timeout]);
      if (timedOut) continue;
      if (uri) return uri;
      opts.warn?.(`PDF logo: no image from ${url}`);
    } catch (e) {
      opts.warn?.(`PDF logo: ${url} failed: ${String(e)}`);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
  return "";
}
