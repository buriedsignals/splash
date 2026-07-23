import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ProduceReport, VisualFormat } from "./producer-spec";
import type { BrandProfile } from "./brand-profile";
import {
  editorialPayload,
  sha256Hex,
  verifyEditorialSignature,
} from "./editorial-signoff";
// The single-format media-shape rule + the hosted-URL check live in the shared produce contract
// (lib/core/contract.ts); this EXPORT-stage guard delegates its static/video shape check to it so
// one rule (and its exact error messages) lives once, and re-exports isHostedUrl for its own
// callers (export-code.mjs, the tests). contract.ts imports nothing FROM here — no cycle.
import { assertFileMedia, isHostedUrl } from "../../../lib/core/contract";

export { isHostedUrl };

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

/**
 * Re-verify editorial sign-offs at export against the CURRENT artifact bytes (S4d). When the
 * profile declares requiredSigners, every one must have a recorded sign-off whose signedHash equals
 * the current hash AND whose signature re-verifies — else throw. With no requiredSigners, never
 * blocks: returns the honest signed/unsigned state so the caller can record it.
 */
export function assertEditoriallyCleared(
  report: ProduceReport,
  id: string,
  profile: BrandProfile,
  currentArtifactBytes: Uint8Array,
): { signedBy: string[]; unsigned: boolean } {
  const r = report.results.find((x) => x.id === id);
  if (!r) throw new Error(`unknown proposal ${id}`);
  const hash = sha256Hex(currentArtifactBytes);
  const signers = profile.signers ?? [];
  const signoffs = r.editorialSignoffs ?? [];
  const validFor = (signerId: string): boolean => {
    const so = signoffs.find((s) => s.signerId === signerId);
    const signer = signers.find((s) => s.id === signerId);
    return (
      !!so &&
      !!signer &&
      so.signedHash === hash &&
      verifyEditorialSignature({
        proposalId: id,
        sha256hex: hash,
        signature: so.signature,
        signer,
      })
    );
  };
  const required = profile.requiredSigners ?? [];
  if (required.length > 0) {
    for (const sid of required) {
      const so = signoffs.find((s) => s.signerId === sid);
      if (!so)
        throw new Error(
          `refusing to export ${id}: required editorial sign-off missing from ${sid}`,
        );
      if (so.signedHash !== hash)
        throw new Error(
          `refusing to export ${id}: ${sid}'s sign-off is for a different artifact (re-produced since sign-off) — re-sign required`,
        );
      if (!validFor(sid))
        throw new Error(
          `refusing to export ${id}: ${sid}'s editorial signature failed re-verification`,
        );
    }
    return { signedBy: [...required], unsigned: false };
  }
  const signedBy = signers.map((s) => s.id).filter(validFor);
  return { signedBy, unsigned: signedBy.length === 0 };
}

// The delivery FORM axis — orthogonal to `VisualFormat`. Only interactive/scrolly deliveries
// choose one; static/video have exactly one shape, so `form` is always null there.
export type DeliveryForm = "html" | "code-source" | "embed" | null;

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
//       "code-source" → a non-empty source-bundle directory listing that is actually runnable:
//                       `package.json` + `vite.config.ts` at its root (see below).
//       "embed"       → EXACTLY an EMBED_URL.txt holding the hosted link — never the pre-export
//                       production output. When `opts.dir` is given the URL's shape is verified
//                       too (isHostedUrl), so a blank / stalled-deploy file cannot fake delivery.
export function assertDelivered(
  files: string[],
  opts: { format: VisualFormat; form: DeliveryForm; dir?: string },
): void {
  const { format, form, dir } = opts;

  if (format === "static") {
    if (form !== null)
      throw new Error(
        `not a delivery: static format takes no form (got ${String(form)})`,
      );
    // Shared single-format media shape (no .html, exactly one image) — the SAME rule the
    // produce-stage contract runs, so it lives once (contract.ts). The export stage then adds
    // its STRICTER "exactly the media file, no companions" floor (the produce stage is lenient
    // about byproducts; a hand-over folder must be clean).
    assertFileMedia("static", files);
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
    assertFileMedia("video", files);
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
    // A runnable bundle carries a Vite project at its root — package.json + vite.config.ts.
    // This stops a regression back to a lone interactive.html copy from passing as code-source.
    if (!files.includes("package.json") || !files.includes("vite.config.ts"))
      throw new Error(
        `not a delivery: ${format} form=code-source must be a runnable source bundle (package.json + vite.config.ts at its root), got ${JSON.stringify(files)}`,
      );
    return;
  }
  if (form === "embed") {
    // A form-c embed delivery is the recorded hosted URL, NOT the produced artifact. Mirror the
    // static/video "exactly the media file" strictness: the folder must be EXACTLY EMBED_URL.txt.
    // Handing over the pre-export production output (interactive.html / static.png / .mp4) and
    // calling it delivered is the "faked delivered" bug this guards against.
    if (!files.includes("EMBED_URL.txt"))
      throw new Error(
        `not a delivery: ${format} form=embed requires a recorded hosted-URL artifact (EMBED_URL.txt) — found none; the pre-export production output is not an embed deliverable`,
      );
    const stray = files.filter((f) => f !== "EMBED_URL.txt");
    if (stray.length)
      throw new Error(
        `not a delivery: ${format} form=embed must be exactly EMBED_URL.txt, found extra ${JSON.stringify(
          stray,
        )} (the produced artifact is not the embed deliverable)`,
      );
    // When the folder is readable, the URL itself must look like a resolvable hosted https link —
    // never blank, never a placeholder — so a stalled deploy that wrote an empty file cannot pass.
    if (dir != null) {
      let url = "";
      try {
        url = readFileSync(join(dir, "EMBED_URL.txt"), "utf8").trim();
      } catch {
        url = "";
      }
      if (!isHostedUrl(url))
        throw new Error(
          `not a delivery: ${format} form=embed EMBED_URL.txt has no resolvable https URL (got ${JSON.stringify(
            url,
          )})`,
        );
    }
    return;
  }
  throw new Error(
    `not a delivery: ${format} requires a form (html | code-source | embed), got ${String(form)}`,
  );
}
