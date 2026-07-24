import { execFileSync } from "node:child_process";
import { writeFileSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { provenanceHash, type RunManifest, type RunElement } from "./manifest";

const CHART_NATIVE_PRODUCE = join(
  import.meta.dir,
  "..",
  "..",
  "skills",
  "chart-native",
  "scripts",
  "produce-from-spec.mjs",
);

// The ONE craft verb of the loop. Assembles a NativeSpec from the manifest element and
// renders it via chart-native's real CLI (subprocess — never a src/ import), then records
// the artifact + its provenance so stalenessOf() can track it. Reads the FROZEN input by
// path (relative to the run dir) — never inline content. Artifact hashing/robust exit come
// in Task 5.
export function produce(
  run: RunManifest,
  el: RunElement,
  runDir: string,
  outDir: string,
): RunElement {
  if (!el.angle || !el.proposal?.chosenId)
    throw new Error("produce: need an angle and a chosen form");
  if (!run.input.data) throw new Error("produce: no frozen data input");
  const chosen = el.proposal.options.find(
    (o) => o.id === el.proposal!.chosenId,
  );
  if (!chosen)
    throw new Error(`produce: no option with id ${el.proposal.chosenId}`);

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

  const specPath = join(mkdtempSync(join(tmpdir(), "loop-spec-")), "spec.json");
  writeFileSync(specPath, JSON.stringify(nativeSpec));
  execFileSync("bun", [CHART_NATIVE_PRODUCE, specPath, outDir, "static"], {
    stdio: "pipe",
  });

  return {
    ...el,
    artifact: {
      path: join(outDir, "static.png"),
      sha256: "", // filled in Task 5
      provenanceHash: provenanceHash(run, el),
      producedAt: new Date().toISOString(),
    },
  };
}
