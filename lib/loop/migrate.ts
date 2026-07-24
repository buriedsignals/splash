import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { freezeInput } from "./freeze";
import { parseManifest, type RunManifest, type RunElement } from "./manifest";

// Upgrade an on-disk manifest to the current schema. v1 stored inline CSV content and a
// single top-level element; v2 freezes the content (path+hash) and wraps it in elements[].
export function migrate(raw: unknown, runDir: string): RunManifest {
  if (!raw || typeof raw !== "object")
    throw new Error("migrate: manifest is not an object");
  const obj = raw as { schemaVersion?: number };
  if (obj.schemaVersion === 2) return parseManifest(raw);
  if (obj.schemaVersion !== 1)
    throw new Error(`migrate: unsupported schemaVersion ${obj.schemaVersion}`);
  return parseManifest(migrateV1toV2(raw as V1Manifest, runDir));
}

type V1Manifest = {
  runId: string;
  input: { dataCsv: string; statedPoint?: string };
  orient?: {
    profile: { columns: string[]; numericColumns: string[]; rowCount: number };
    supportsPoint: boolean;
    note?: string;
  };
  angle?: RunElement["angle"];
  proposal?: RunElement["proposal"];
  artifact?: { path: string; provenanceHash: string };
};

function migrateV1toV2(v1: V1Manifest, runDir: string): RunManifest {
  const scratch = mkdtempSync(join(tmpdir(), "loop-mig-src-"));
  const src = join(scratch, "data.csv");
  writeFileSync(src, v1.input.dataCsv);
  const data = freezeInput(runDir, src, "data");
  rmSync(scratch, { recursive: true, force: true });
  // v1 artifacts stored an absolute path outside any run dir and lacked sha256/producedAt —
  // stale-by-construction and not portable. Drop the field entirely rather than copy it
  // forward; the next produce re-derives it cleanly under the run dir.
  const el: RunElement = {
    id: "e1",
    angle: v1.angle,
    proposal: v1.proposal,
  };
  return {
    runId: v1.runId,
    schemaVersion: 2,
    input: { data },
    ...(v1.orient ? { orient: v1.orient } : {}),
    elements: [el],
    events: [],
  };
}
