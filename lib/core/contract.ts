// The produce contract — spec-in / artifact-out, shared by every engine and enforced ONCE
// by the unified dispatcher (skills/splash/src/adapters.ts), never by each export path.
//
// Two shapes:
//   ProduceContext    — what the spine hands a producer (the pinned single format, the
//                       canonical channel, the per-proposal outDir/id, optional theme/locale).
//                       Threaded IDENTICALLY whatever the transport (subprocess or in-process) —
//                       the end of the SPLASH_CHANNEL-env-native-only threading.
//   DeliveredArtifact — what a producer returns: the pinned format, its delivery FORM
//                       (`file` = owned local files on disk; `hosted` = a Datawrapper embed URL,
//                       no owned media), the produced files, an optional public URL, and a free
//                       report bag.
//
// assertDeliveredContract is the single-format delivery clause the dispatcher verifies on every
// produced artifact (the produce-stage counterpart of export-guard's export-stage assertDelivered;
// the two SHARE their static/video media-shape logic + isHostedUrl, so a shape rule lives once).
//
// Type-only imports of Channel / VisualFormat (never a runtime import) so this core module has no
// runtime dependency on skills/splash — no import cycle with export-guard, which imports FROM here.
import type { VisualFormat } from "./vocabulary";
import type { Channel } from "./vocabulary";
import { isPlaceholderHost } from "./placeholder-host";

// What the spine hands a producer. Threaded identically for both transports: the subprocess
// path forwards channel as SPLASH_CHANNEL + format/outDir on argv; the in-process path passes
// this object straight through. `channel` is always resolved (the spine defaults an absent
// proposal channel to article-web before dispatch); themeBg/locale are best-effort context.
export interface ProduceContext {
  channel: Channel;
  format: VisualFormat;
  outDir: string;
  id: string;
  themeBg?: string;
  locale?: string;
}

// What a producer returns. `form` is the delivery axis every produced artifact carries:
//   "file"   — owned local artifacts on disk (natives; dw-chart/map-dw "static" PNG export).
//   "hosted" — a Datawrapper embed alone, no owned media (dw-chart/map-dw "interactive").
// (This is the PRODUCE-stage form axis. It is distinct from export-guard's EXPORT-stage
// DeliveryForm — html | code-source | embed | null — which is the journalist's hand-over choice.)
export interface DeliveredArtifact {
  format: VisualFormat;
  form: "file" | "hosted";
  files: string[];
  publicUrl?: string;
  report: Record<string, unknown>;
}

export const IMAGE_EXTENSIONS = [".png", ".svg", ".jpg", ".jpeg"];

// A recorded hosted URL must LOOK resolvable before a hosted delivery may claim it shipped: a real
// https origin with a domain host, not blank / a placeholder / a bare local host. A shape check, not
// a network probe. Lives here (not export-guard) because BOTH the produce-stage hosted contract and
// the export-stage embed check need it; export-guard re-exports it for its existing call sites.
export function isHostedUrl(url: unknown): boolean {
  if (typeof url !== "string") return false;
  const u = url.trim();
  if (!/^https:\/\//i.test(u)) return false;
  let host: string;
  try {
    host = new URL(u).hostname;
  } catch {
    return false;
  }
  if (!host.includes(".")) return false; // must be a domain, not a bare/local host
  if (isPlaceholderHost(host)) return false;
  return true;
}

// The single-format delivery clause the dispatcher runs on every produced artifact.
//
//   hosted  → a resolvable https publicUrl (a hosted delivery with no URL is broken).
//   file    → format-appropriate media PRESENT (lenient about produce-time byproducts —
//             config.json / native-source.json / ephemeral review stills legitimately sit
//             beside the deliverable, unlike the strict export-stage hand-over folder):
//               static             → exactly one image (.png/.svg/.jpg), no .html.
//               video              → exactly one .mp4.
//               interactive/scrolly→ the self-contained interactive.html / scrolly.html present.
//
// The static/video image+mp4 messages are byte-identical to export-guard's assertDelivered, which
// delegates its own form-null static/video shape check here (one shape rule, two stages).
export function assertDeliveredContract(a: DeliveredArtifact): void {
  if (a.form === "hosted") {
    if (!isHostedUrl(a.publicUrl))
      throw new Error(
        `not a delivery: ${a.format} form=hosted requires a resolvable https publicUrl, got ${JSON.stringify(a.publicUrl)}`,
      );
    return;
  }
  // form === "file"
  assertFileMedia(a.format, a.files);
}

// The file-form media-shape check, shared with export-guard's static/video branches so the rule
// (and its error messages) live once. Basename-aware so it works on both full paths (produce
// stage — collectOutputs returns join(dir, name)) and bare basenames (export stage — readdirSync).
export function assertFileMedia(format: VisualFormat, files: string[]): void {
  const lower = files.map((f) => f.toLowerCase());
  const basename = (f: string): string => f.split("/").pop() ?? f;

  if (format === "static") {
    if (lower.some((f) => f.endsWith(".html")))
      throw new Error(
        "not a delivery: static format must not include an .html file",
      );
    const media = lower.filter((f) =>
      IMAGE_EXTENSIONS.some((ext) => f.endsWith(ext)),
    );
    if (media.length !== 1)
      throw new Error(
        `not a delivery: static format requires exactly one image file (.png/.svg/.jpg), found ${media.length}`,
      );
    return;
  }

  if (format === "video") {
    const media = lower.filter((f) => f.endsWith(".mp4"));
    if (media.length !== 1)
      throw new Error(
        `not a delivery: video format requires exactly one .mp4 file, found ${media.length}`,
      );
    return;
  }

  // interactive | scrolly — the self-contained produced html file must be present.
  const htmlName = format === "scrolly" ? "scrolly.html" : "interactive.html";
  if (!files.some((f) => basename(f) === htmlName))
    throw new Error(
      `not a delivery: ${format} form=file requires ${htmlName}, not found`,
    );
}
