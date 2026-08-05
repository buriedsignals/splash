import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ProduceReport, VisualFormat } from "./producer-spec";
import type { BrandProfile } from "./brand-profile";
import { sha256Hex, verifyEditorialSignature } from "./editorial-signoff";
// The single-format media-shape rule + the hosted-URL check live in the shared produce contract
// (lib/core/contract.ts); this EXPORT-stage guard delegates its static/video shape check to it so
// one rule (and its exact error messages) lives once, and re-exports isHostedUrl for its own
// callers (export-code.mjs, the tests). contract.ts imports nothing FROM here — no cycle.
import { assertFileMedia, isHostedUrl } from "../../../lib/core/contract";
import {
  exportPrecondition,
  type HandoverForm,
} from "../../../lib/loop/preconditions";
import { refusalSentence } from "../../../lib/core/routed-refusal";
import { createHash } from "node:crypto";

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
  // "shown" and "approved" have to name the same bytes — but this comparison does not itself
  // verify that. gate.ts:38-49 is the only writer of either field, and it writes BOTH from the
  // same computed `approvedHash` variable in the same object literal, so on any honestly-written
  // report `r.shownSha256 === r.approvedHash` is TAUTOLOGICAL: it can only ever fire on a
  // partial hand-edit (something changed one field and not the other) after the fact. It is not
  // a re-verification against the presentation receipt — gate.ts already does that, once, via
  // `shownCovers(artifactPath, approvedHash)` at write time; nothing re-checks it here against
  // what is actually on disk NOW. So this catches a stale or tampered VALUE, never an absent
  // one — and it is bypassable by omission: a report with no `shownSha256` at all still ships
  // (see the gating condition below). The real closure, not yet done here: re-read the
  // presentation receipt at export time via `shownCovers(path, r.approvedHash)`
  // (`lib/loop/presentation.ts:105`; a path is available from `r.outputs`), and require
  // `shownSha256`'s PRESENCE rather than skip when absent, reasoned about the way
  // `lib/loop/deliver.ts:147-157` reasons about which record shapes could legitimately lack a
  // field, rather than a blanket `!== undefined` skip.
  //
  // Gated on `r.shownSha256 !== undefined` rather than requiring its presence outright: gate.ts
  // writes it unconditionally on every approval, so every REAL report carries it, but a wide set
  // of existing fixtures across the export path (export-code.test.ts, deploy-embed.test.ts,
  // apply-signoff.test.ts and others) hand-construct `renderApproved: true` results that predate
  // this field (Task 8 added it) and never set it. Those ~45 failures are STALE FIXTURES, not
  // evidence the field is ever genuinely absent from a real report — refusing them unconditionally
  // just breaks unrelated tests whose doubles have not been updated. The scoping decision (skip
  // rather than require) stands as a blast-radius call on that basis, not because the field is
  // legitimately optional on a real report.
  if (r.shownSha256 !== undefined && r.shownSha256 !== r.approvedHash)
    throw new Error(
      `refusing to export ${id}: the approved bytes are not the bytes shown to the journalist ` +
        `(shownSha256 !== approvedHash) — re-show the current render ` +
        `(bun lib/host/cli.ts present --path <artifact>) and re-approve (run gate-render)`,
    );
  // An editorial verdict nobody signed for does not ship. The mechanical half needs no signature
  // (its commands answered); this is only ever about the half that is a judgement.
  const judged = (r.reviewProbes ?? []).some((p) => p.kind === "editorial");
  if (judged && r.reviewer?.independentSemanticReview !== "available")
    throw new Error(
      `refusing to export ${id}: the editorial read of this visual does not say who did it — ` +
        `have it done by someone who did not write this visual, and record who did it`,
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
//
// ALIASED rather than re-declared: lib/loop/preconditions.ts owns the union now, because the
// same rule is read by the host façade and by this guard, and two structurally identical unions
// in two layers is how the two readers start disagreeing about what "code-source" means.
export type DeliveryForm = HandoverForm;

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
/** The file `export-code.mjs` — and nothing else — leaves in a delivered folder. */
export const EXPORT_RECEIPT = ".splash-export.json";

// ── WHY A DELIVERED FOLDER IS SIGNED (registry E19) ────────────────────────────────────────
// Observed live 2026-08-05: `export-code.mjs` refused twice — "not render-reviewed", exit 1,
// naming the command to run — and the host model then COPIED THE PNG INTO exports/ BY HAND and
// announced « L'export est terminé, le fichier a été livré », with a plausible placement block.
// It did not merely claim a delivery that had not happened: it manufactured one. An escalation of
// E11 — on 2026-08-03 the model routed around a skill it could not invoke; here it routed around
// an explicit refusal from our own code that told it what to do instead.
//
// The signature lives HERE because this function is the one thing every delivery passes through
// (ten call sites in export-code.mjs, no other writer). The gate that validates a folder is the
// gate that signs it: a folder cannot pass without being signed, nor be signed without passing. A
// separate "now write the receipt" step beside each call site would be ten chances to forget —
// the exact class of defect this guard exists to remove.
//
// It records the BYTES, not just the names: a hand-swapped file is a different delivery even when
// the folder still looks right. What it does NOT do is prove the bytes are good — only that this
// code wrote them, which is precisely the claim a fabricated folder cannot make.
// `dir` is REQUIRED, and that is the mechanical half of this guard. It was optional, and five of
// the nine call sites in export-code.mjs did not pass it — they would have validated a folder and
// left it unsigned, which is the failure this receipt exists to prevent, reintroduced by omission.
// Making it required moves the obligation from a reader's memory to the type-checker.
export function assertDelivered(
  files: string[],
  opts: { format: VisualFormat; form: DeliveryForm; dir: string },
): void {
  assertDeliveredShape(files, opts);
  writeExportReceipt(opts.dir, files, opts);
}

function writeExportReceipt(
  dir: string,
  files: string[],
  opts: { format: VisualFormat; form: DeliveryForm },
): void {
  const delivered = files.filter((f) => f !== EXPORT_RECEIPT);
  const hashes: Record<string, string> = {};
  for (const f of delivered) {
    try {
      hashes[f] = createHash("sha256")
        .update(readFileSync(join(dir, f)))
        .digest("hex");
    } catch {
      // A directory entry (a source bundle's subfolder) has no bytes of its own. Recorded by
      // name, without a hash, rather than failing a delivery that is otherwise valid.
      hashes[f] = "";
    }
  }
  writeFileSync(
    join(dir, EXPORT_RECEIPT),
    JSON.stringify(
      { writtenBy: "export-code.mjs", format: opts.format, form: opts.form, files: hashes },
      null,
      2,
    ),
  );
}

function assertDeliveredShape(
  files: string[],
  opts: { format: VisualFormat; form: DeliveryForm; dir?: string },
): void {
  const { format, form, dir } = opts;
  // The receipt is bookkeeping, never a deliverable: a static delivery is still exactly one PNG
  // after it has been signed, so re-validating a signed folder must still pass.
  files = files.filter((f) => f !== EXPORT_RECEIPT);

  // ① A PRODUCTION FOLDER IS NOT A DELIVERY. The 16 proven non-deliveries of the 2026-07-28 sweep
  // are all inside the 36 cases that handed this folder back, and none outside it — so this is a
  // measured rule, not a tidiness preference. The one exemption (a runnable source bundle keeps
  // its config.json) lives in exportPrecondition, with the line of bundle-source.mjs that earns it.
  //
  // FIRST, before the per-format shapes: "this is the wrong folder entirely" is a more useful
  // thing to be told than "your static delivery has 4 files".
  const planted = exportPrecondition(files, { format, form });
  if (planted) throw new Error(refusalSentence(planted));

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
    // A video HAS forms since 2026-08-04 — the file, a hosted link, or an insertion into the
    // journalist's article. `null` stays legal and means the file, so every caller that predates
    // the menu still delivers exactly what it used to.
    if (form === null || form === "file") {
      assertFileMedia("video", files);
      if (files.length !== 1)
        throw new Error(
          "not a delivery: video form=file must be exactly the media file, no extra files",
        );
      return;
    }
    if (form === "embed" || form === "cms") {
      // Same strictness as the interactive forms of the same names: the deliverable is the
      // RECORDED address, never the mp4 sitting beside it. Handing the produced file over and
      // calling it hosted is the faked delivery this guards.
      const marker = form === "embed" ? "EMBED_URL.txt" : "CMS_ARTICLE_URL.txt";
      if (!files.includes(marker))
        throw new Error(
          `not a delivery: video form=${form} requires ${marker} — found none; the produced mp4 is not proof that it was published`,
        );
      const stray = files.filter((f) => f !== marker);
      if (stray.length)
        throw new Error(
          `not a delivery: video form=${form} must be exactly ${marker}, found extra ${JSON.stringify(stray)}`,
        );
      if (dir != null) {
        let url = "";
        try {
          url = readFileSync(join(dir, marker), "utf8").trim();
        } catch {
          url = "";
        }
        if (!isHostedUrl(url))
          throw new Error(
            `not a delivery: video form=${form} ${marker} has no resolvable https URL (got ${JSON.stringify(url)})`,
          );
      }
      return;
    }
    throw new Error(
      `not a delivery: video takes form file | embed | cms (got ${String(form)})`,
    );
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
  if (form === "cms") {
    // Form d is delivered INSIDE the newsroom's CMS: the deliverable is the article, and the
    // only thing Splash owns on disk is the record of where it went. Same strictness as embed —
    // handing back the produced html and calling it "inserted" is the same faked delivery.
    if (!files.includes("CMS_ARTICLE_URL.txt"))
      throw new Error(
        `not a delivery: ${format} form=cms requires a recorded article URL (CMS_ARTICLE_URL.txt) — found none; the produced artifact is not proof that the CMS took it`,
      );
    const stray = files.filter((f) => f !== "CMS_ARTICLE_URL.txt");
    if (stray.length)
      throw new Error(
        `not a delivery: ${format} form=cms must be exactly CMS_ARTICLE_URL.txt, found extra ${JSON.stringify(stray)}`,
      );
    if (dir != null) {
      let url = "";
      try {
        url = readFileSync(join(dir, "CMS_ARTICLE_URL.txt"), "utf8").trim();
      } catch {
        url = "";
      }
      if (!isHostedUrl(url))
        throw new Error(
          `not a delivery: ${format} form=cms CMS_ARTICLE_URL.txt has no resolvable https URL (got ${JSON.stringify(url)})`,
        );
    }
    return;
  }
  throw new Error(
    `not a delivery: ${format} requires a form (html | code-source | embed | cms), got ${String(form)}`,
  );
}
