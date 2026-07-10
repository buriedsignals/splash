import type { ProduceReport, VisualFormat } from "./producer-spec";

// The one MECHANICAL gate: nothing ships unless it was actually produced AND the human
// approved the render. Lives in the irreversible-action scripts so a lower-level call
// cannot bypass it.
export function assertShippable(report: ProduceReport, id: string): void {
  const r = report.results.find((x) => x.id === id);
  if (!r) throw new Error(`unknown proposal ${id}`);
  if (r.status !== "produced")
    throw new Error(
      `refusing to export ${id}: not produced (status=${r.status})`,
    );
  if (!r.reviewed)
    throw new Error(
      `refusing to export ${id}: not render-reviewed (run the render-review + review-gate first)`,
    );
  if (!r.renderApproved)
    throw new Error(
      `refusing to export ${id}: not render-approved (run gate-render first)`,
    );
}

// The delivery FORM axis — orthogonal to `VisualFormat`. Only interactive/scrolly deliveries
// choose one; static/video have exactly one shape, so `form` is always null there.
export type DeliveryForm = "html" | "code-source" | "embed" | null;

const IMAGE_EXTENSIONS = [".png", ".svg", ".jpg", ".jpeg"];

// After EXPORT: a hand-over folder is a REAL delivery only if it matches the shape of the
// spec's pinned `format` (single-format redesign — one element = one format, produced +
// delivered alone; see the 2026-07 plan). There is no more a11y fallback to check: a11y is
// now a FORMAT choice at CADRAGE (picking "static" IS the accessible path), not a
// `static.html` file bolted onto every interactive export. So this no longer requires
// EMBED.md (a delivery is not "every form listed"; the journalist chose ONE) and no longer
// requires an interactive to carry a static.html twin.
//   - static  → exactly one image file (.png/.svg/.jpg), no .html, no companion files.
//   - video   → exactly one .mp4 file.
//   - interactive / scrolly → the CHOSEN form:
//       "html"        → the self-contained interactive.html / scrolly.html file present.
//       "code-source" → a non-empty source-bundle directory listing.
//       "embed"       → a recorded hosted-URL artifact (non-empty listing; the hosted link
//                       itself lives in the report, not on disk).
export function assertDelivered(
  files: string[],
  opts: { format: VisualFormat; form: DeliveryForm },
): void {
  const { format, form } = opts;

  if (format === "static") {
    if (form !== null)
      throw new Error(
        `not a delivery: static format takes no form (got ${String(form)})`,
      );
    if (files.some((f) => f.toLowerCase().endsWith(".html")))
      throw new Error(
        "not a delivery: static format must not include an .html file",
      );
    const media = files.filter((f) =>
      IMAGE_EXTENSIONS.some((ext) => f.toLowerCase().endsWith(ext)),
    );
    if (media.length !== 1)
      throw new Error(
        `not a delivery: static format requires exactly one image file (.png/.svg/.jpg), found ${media.length}`,
      );
    if (files.length !== 1)
      throw new Error(
        "not a delivery: static format delivery must be exactly the media file, no extra files",
      );
    return;
  }

  if (format === "video") {
    if (form !== null)
      throw new Error(
        `not a delivery: video format takes no form (got ${String(form)})`,
      );
    const media = files.filter((f) => f.toLowerCase().endsWith(".mp4"));
    if (media.length !== 1)
      throw new Error(
        `not a delivery: video format requires exactly one .mp4 file, found ${media.length}`,
      );
    if (files.length !== 1)
      throw new Error(
        "not a delivery: video format delivery must be exactly the media file, no extra files",
      );
    return;
  }

  // format is "interactive" | "scrolly" from here on.
  if (form === "html") {
    const htmlName = format === "scrolly" ? "scrolly.html" : "interactive.html";
    if (!files.includes(htmlName))
      throw new Error(
        `not a delivery: ${format} form=html requires ${htmlName}, not found`,
      );
    return;
  }
  if (form === "code-source") {
    if (files.length === 0)
      throw new Error(
        `not a delivery: ${format} form=code-source requires a non-empty source-bundle directory`,
      );
    return;
  }
  if (form === "embed") {
    if (files.length === 0)
      throw new Error(
        `not a delivery: ${format} form=embed requires a recorded hosted-URL artifact`,
      );
    return;
  }
  throw new Error(
    `not a delivery: ${format} requires a form (html | code-source | embed), got ${String(form)}`,
  );
}
