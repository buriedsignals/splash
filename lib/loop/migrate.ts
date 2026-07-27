import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { freezeInput } from "./freeze";
import {
  parseManifest,
  type DeliveryRecord,
  type RunManifest,
  type RunElement,
} from "./manifest";

// Upgrade an on-disk manifest to the current schema. v1 stored inline CSV content and a
// single top-level element; v2 freezes the content (path+hash) and wraps it in elements[];
// v3 drops the dormant, unconvertible v2 delivery slot; v4 adds the run's route and channel
// and the proposal's excluded list. v1 chains through v2 and v3 to v4.
export function migrate(raw: unknown, runDir: string): RunManifest {
  if (!raw || typeof raw !== "object")
    throw new Error("migrate: manifest is not an object");
  const obj = raw as { schemaVersion?: number };
  if (obj.schemaVersion === 4) return parseManifest(raw);
  if (obj.schemaVersion === 3) return parseManifest(migrateV3toV4(raw));
  if (obj.schemaVersion === 2)
    return parseManifest(migrateV3toV4(migrateV2toV3(raw)));
  if (obj.schemaVersion !== 1)
    throw new Error(`migrate: unsupported schemaVersion ${obj.schemaVersion}`);
  return parseManifest(
    migrateV3toV4(migrateV2toV3(migrateV1toV2(raw as V1Manifest, runDir))),
  );
}

// A delivery record whose package was written under the PRE-FIX layout (`elements/<id>/…`,
// the render directory produce.ts writes into and freshOutDir — lib/core/verbs/exec.ts —
// wipes clean before every re-produce; see deliver.ts's own elementDeliveryDir comment) can no
// longer be trusted: by the time this code runs, a re-produce may already have deleted the
// file it names, or may be about to. There is no honest way to "migrate" it forward (the file
// itself was never moved to the new `deliveries/<id>/` layout — only the STRING would move,
// which would be a lie the next time someone actually opens the archive), so it is DROPPED —
// the same discipline migrateV1toV2 above already applies to a v1 artifact it could not trust
// either. Dropping it just means the matching destination reads as never delivered for its
// current provenance: `deliver()` re-publishes it, this time into the safe directory.
//
// Not gated on `schemaVersion` (the field shape is unchanged, so there is nothing to bump):
// `readManifest` only calls `migrate()` when schemaVersion differs from the CURRENT one, so a
// version-gated fix would never run for the on-disk v4 manifests that actually carry the
// hazard. deliver.ts calls this directly, on every read of `el.delivery.delivered`, instead.
export function dropLegacyElementsDelivery(
  delivered: DeliveryRecord[],
): DeliveryRecord[] {
  return delivered.filter(
    (d) => !d.artifact || !d.artifact.path.startsWith("elements/"),
  );
}

// v3 had neither a route nor a channel: every v3 run was an embeddable element rendered for
// the web article, which is exactly what produce.ts hard-coded as STUBBED_CHANNEL. Writing
// those two defaults down is the migration — nothing is lost, a stub becomes state.
function migrateV3toV4(v3: unknown): unknown {
  const m = v3 as { elements?: Record<string, unknown>[] };
  return {
    ...(v3 as object),
    schemaVersion: 4,
    route: "embed",
    channel: "article-web",
    elements: (m.elements ?? []).map((el) => {
      const proposal = el.proposal as Record<string, unknown> | undefined;
      return proposal ? { ...el, proposal: { excluded: [], ...proposal } } : el;
    }),
  };
}

// v2's delivery slot was DORMANT: no live path ever wrote it, and its `delivered: HashRef[]`
// carries neither a publisher nor a provenance hash — there is nothing to convert honestly.
// Dropping it is written down here rather than left as a silent loss.
function migrateV2toV3(v2: unknown): unknown {
  const m = v2 as { elements?: Record<string, unknown>[] };
  return {
    ...(v2 as object),
    schemaVersion: 3,
    elements: (m.elements ?? []).map(({ delivery, ...rest }) => rest),
  };
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

// Returns `unknown`, not `RunManifest`: its output now feeds migrateV2toV3 rather than being
// the final shape, so it no longer has to satisfy the current schema by itself.
function migrateV1toV2(v1: V1Manifest, runDir: string): unknown {
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
