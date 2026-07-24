import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { freezeInput } from "./freeze";
import { parseManifest, type RunManifest, type RunElement } from "./manifest";

// Upgrade an on-disk manifest to the current schema. v1 stored inline CSV content and a
// single top-level element; v2 freezes the content (path+hash) and wraps it in elements[].
export function migrate(raw: unknown, runDir: string): RunManifest {
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
  const src = join(mkdtempSync(join(tmpdir(), "loop-mig-src-")), "data.csv");
  writeFileSync(src, v1.input.dataCsv);
  const data = freezeInput(runDir, src, "data");
  const el: RunElement = {
    id: "e1",
    angle: v1.angle,
    proposal: v1.proposal,
    // v1 artifacts lacked sha256/producedAt; treat as stale (unknown provenance) so the
    // next produce re-derives cleanly rather than trusting an unhashed artifact.
    ...(v1.artifact
      ? {
          artifact: {
            path: v1.artifact.path,
            sha256: "",
            provenanceHash: v1.artifact.provenanceHash,
            producedAt: "1970-01-01T00:00:00.000Z",
          },
        }
      : {}),
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
