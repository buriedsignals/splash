import { execFileSync } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { provenanceHash, type RunManifest } from "./manifest";

// From lib/loop → repo root → the chart-native CLI. import.meta.dir === lib/loop.
const CHART_NATIVE_PRODUCE = join(
  import.meta.dir,
  "..",
  "..",
  "skills",
  "chart-native",
  "scripts",
  "produce-from-spec.mjs",
);

// The ONE craft verb of the slice. Assembles a NativeSpec from the manifest and
// renders it via chart-native's real CLI (subprocess — never a src/ import), then
// records the artifact + its provenance so stalenessOf() can track it.
export function produce(m: RunManifest, outDir: string): RunManifest {
  if (!m.angle || !m.proposal?.chosenId)
    throw new Error("produce: need an angle and a chosen form");
  const chosen = m.proposal.options.find((o) => o.id === m.proposal!.chosenId);
  if (!chosen)
    throw new Error(`produce: no option with id ${m.proposal.chosenId}`);

  const nativeSpec = {
    nativeType: chosen.nativeType,
    title: m.angle.confirmedTakeaway,
    altInsight: m.angle.altInsight,
    unit: m.angle.unit,
    source: { name: "Provided by the newsroom" },
    ...(m.angle.emphasis ? { highlight: m.angle.emphasis } : {}),
    format: "static",
    data: m.input.dataCsv,
  };

  const specPath = join(mkdtempSync(join(tmpdir(), "loop-spec-")), "spec.json");
  writeFileSync(specPath, JSON.stringify(nativeSpec));
  execFileSync("bun", [CHART_NATIVE_PRODUCE, specPath, outDir, "static"], {
    stdio: "pipe",
  });

  return {
    ...m,
    artifact: {
      path: join(outDir, "static.png"),
      provenanceHash: provenanceHash(m),
    },
  };
}
