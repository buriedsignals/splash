import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { sha256 } from "@noble/hashes/sha2.js";
import { fail, ok, render, type VerbResult } from "../core/verbs";
import { provenanceHash, type RunManifest, type RunElement } from "./manifest";

// The décor is stubbed until the SETUP/preflight sub-project exists: every element of
// this tranche renders for the web-article channel. Documented as a stub, not a default
// buried in a call — the contract requires a RESOLVED channel (no ambient env, I5).
const STUBBED_CHANNEL = "article-web" as const;

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

  const dataCsv = readFileSync(join(runDir, run.input.data.path), "utf8");
  const nativeSpec = {
    nativeType: chosen.nativeType,
    title: el.angle.confirmedTakeaway,
    altInsight: el.angle.altInsight,
    unit: el.angle.unit,
    source: { name: "Provided by the newsroom" },
    ...(el.angle.emphasis ? { highlight: el.angle.emphasis } : {}),
    format: "static",
    data: dataCsv,
  };

  const result = await render({
    engine: "chart-native",
    spec: nativeSpec,
    format: "static",
    channel: STUBBED_CHANNEL,
    outDir: join(runDir, "elements", el.id),
    id: el.id,
  });
  if (!result.ok) return result;

  const artifactPath = result.value.files.find((f) => f.endsWith("static.png"));
  if (!artifactPath)
    return fail("engine-failed", "produce: no static.png in the delivery");
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
}
