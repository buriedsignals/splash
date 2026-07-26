import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { sha256 } from "@noble/hashes/sha2.js";
import { fail, ok, render, type VerbResult } from "../core/verbs";
import { IMAGE_EXTENSIONS } from "../core/contract";
import type { VisualFormat } from "../core/vocabulary";
import { provenanceHash, type RunManifest, type RunElement } from "./manifest";
// Populates the producer registry the render verb dispatches from — without it every
// render answers `unknown-engine`. The loop's ONE point of knowledge about skills/ lives
// in that file, on purpose; see its header.
import "./engines";

// Which delivered file IS the artifact, for a given format — the same shape
// assertDeliveredContract (lib/core/contract.ts) already validated is present before this
// runs, so this only has to LOCATE it, not re-validate it. Kept in step with
// assertFileMedia's naming (interactive.html / scrolly.html / one image / one .mp4) rather
// than re-deriving its own convention.
function artifactFileFor(
  format: VisualFormat,
  files: string[],
): string | undefined {
  if (format === "static")
    return files.find((f) =>
      IMAGE_EXTENSIONS.some((ext) => f.toLowerCase().endsWith(ext)),
    );
  if (format === "video")
    return files.find((f) => f.toLowerCase().endsWith(".mp4"));
  const htmlName = format === "scrolly" ? "scrolly.html" : "interactive.html";
  return files.find((f) => f.split("/").pop() === htmlName);
}

// The ONE craft verb of the loop. Assembles a NativeSpec from the manifest element and
// renders it via the shared render verb (lib/core/verbs) — the same execution path the
// legacy orchestrator uses, never a hand-rolled subprocess call — then records the
// artifact + its provenance so stalenessOf() can track it. Reads the FROZEN input by
// path (relative to the run dir) — never inline content. The artifact is written UNDER
// the run dir (elements/<id>/) and its recorded path is run-dir-relative, so the whole
// run dir can be copied elsewhere and still resolve (see resume.ts). A verb never
// throws (I1), so a refusal comes back as a typed failure; the caller is responsible
// for recording a bounded failure event (appendEvent) without advancing element state.
export async function produce(
  run: RunManifest,
  el: RunElement,
  runDir: string,
): Promise<VerbResult<RunElement>> {
  if (!el.angle || !el.proposal?.chosenId)
    return fail("invalid-request", "produce: need an angle and a chosen form");
  if (!run.input.data)
    return fail("invalid-request", "produce: no frozen data input");
  const chosen = el.proposal.options.find(
    (o) => o.id === el.proposal!.chosenId,
  );
  if (!chosen)
    return fail(
      "invalid-request",
      `produce: no option with id ${el.proposal.chosenId}`,
    );

  // The channel is STATE now (manifest v4), not a stub: the brain offered within it, so produce
  // must render within the same one.
  const channel = run.channel;

  // The brain offers across engines (chart-native, map-native, dw-chart, map-dw…), but this
  // verb only knows how to build through chart-native — wiring the rest is a separate tranche.
  // Without this guard a chosen option naming another engine was handed to chart-native
  // anyway (its nativeType meaningless there), producing a WRONG artifact silently. Refusing
  // loud, naming what was chosen, is what a journalist can actually act on.
  if (chosen.engine && chosen.engine !== "chart-native")
    return fail(
      "not-implemented",
      `produce: "${chosen.id}" is a ${chosen.engine} form (${chosen.format ?? "static"}) — only chart-native is wired to produce in this tranche`,
    );

  // The frozen input is read from disk, and a run dir can be incomplete for reasons that
  // have nothing to do with the request being malformed (the file was moved, the copy that
  // travelled to another machine dropped it, the disk refused the read). An unguarded read
  // here would throw ENOENT straight out of the verb, which is exactly what the never-throw
  // invariant forbids: an unreadable input is a BOUNDED failure the caller records, not an
  // exception the caller has to catch.
  let dataCsv: string;
  try {
    dataCsv = readFileSync(join(runDir, run.input.data.path), "utf8");
  } catch (e) {
    return fail(
      "engine-failed",
      `produce: cannot read the frozen input ${run.input.data.path}: ${(e as Error).message}`,
    );
  }
  // The pinned format: what the brain offered and the journalist chose, not a stub — the
  // manifest must not promise "interactive" and receive a static PNG. Options built before
  // the brain existed (fixtures, hand-authored manifests) carry no `format` at all; "static"
  // is the same default produce.ts always rendered before this format threading landed.
  const format: VisualFormat = chosen.format ?? "static";

  const nativeSpec = {
    nativeType: chosen.nativeType,
    title: el.angle.confirmedTakeaway,
    altInsight: el.angle.altInsight,
    unit: el.angle.unit,
    source: { name: "Provided by the newsroom" },
    ...(el.angle.emphasis ? { highlight: el.angle.emphasis } : {}),
    format,
    data: dataCsv,
  };

  const result = await render({
    engine: "chart-native",
    spec: nativeSpec,
    format,
    channel,
    outDir: join(runDir, "elements", el.id),
    id: el.id,
  });
  if (!result.ok) return result;

  const artifactPath = artifactFileFor(format, result.value.files);
  if (!artifactPath)
    return fail(
      "engine-failed",
      `produce: no ${format} artifact in the delivery`,
    );
  // Same discipline for the delivered artifact: reading it back to hash it, and hashing the
  // provenance, are the last unguarded steps before the result — a failure in either is
  // reported, never thrown (the engine DID run, so it is an engine-failed outcome).
  try {
    const artifactBytes = readFileSync(artifactPath);
    return ok({
      ...el,
      artifact: {
        path: relative(runDir, artifactPath),
        sha256: Buffer.from(sha256(artifactBytes)).toString("hex"),
        provenanceHash: provenanceHash(run, el),
        producedAt: new Date().toISOString(),
      },
    });
  } catch (e) {
    return fail(
      "engine-failed",
      `produce: cannot record the delivered artifact ${artifactPath}: ${(e as Error).message}`,
    );
  }
}
