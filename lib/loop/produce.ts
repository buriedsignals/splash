import { execFileSync } from "node:child_process";
import {
  writeFileSync,
  mkdtempSync,
  readFileSync,
  existsSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { sha256 } from "@noble/hashes/sha2.js";
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
// path (relative to the run dir) — never inline content. On failure, throws a descriptive
// error carrying the subprocess exit code + captured stderr; the caller is responsible for
// recording a bounded failure event (appendEvent) without advancing element state.
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

  const specDir = mkdtempSync(join(tmpdir(), "loop-spec-"));
  const specPath = join(specDir, "spec.json");
  writeFileSync(specPath, JSON.stringify(nativeSpec));
  try {
    execFileSync("bun", [CHART_NATIVE_PRODUCE, specPath, outDir, "static"], {
      stdio: "pipe",
    });
  } catch (e) {
    const err = e as { status?: number; stderr?: Buffer };
    throw new Error(
      `produce failed (exit ${err.status ?? "?"}): ${err.stderr?.toString().slice(0, 500) ?? ""}`,
    );
  } finally {
    rmSync(specDir, { recursive: true, force: true });
  }

  const artifactPath = join(outDir, "static.png");
  if (!existsSync(artifactPath))
    throw new Error(`produce: expected artifact not found at ${artifactPath}`);
  const artifactBytes = readFileSync(artifactPath);

  return {
    ...el,
    artifact: {
      path: artifactPath,
      sha256: Buffer.from(sha256(artifactBytes)).toString("hex"),
      provenanceHash: provenanceHash(run, el),
      producedAt: new Date().toISOString(),
    },
  };
}
