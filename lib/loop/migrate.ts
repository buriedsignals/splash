import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { freezeInput } from "./freeze";
import { aspectOf, destinationOf } from "../core/channel-policy";
import {
  parseManifest,
  CURRENT_SCHEMA_VERSION,
  type DeliveryRecord,
  type RunManifest,
  type RunElement,
} from "./manifest";

// The v2-through-v7 leg of the chain, and ONLY that leg: migrateV2toV3, migrateV3toV4,
// migrateV4toV5, migrateV5toV6 and migrateV6toV7 are pure object transforms — no filesystem
// access anywhere in them. v1 is the odd one out (migrateV1toV2 calls freezeInput, which WRITES
// the frozen input file into the run directory) and is deliberately excluded here, which is what
// lets a caller that must not write — lib/host/state.ts's loadRun, read-only by promise —
// migrate a stale manifest in memory without checking each step's purity itself. Returns
// undefined for a v1 manifest, a manifest already current, or a version this build does not
// know, so a caller can tell "migrated" apart from "nothing to do here" without inspecting
// `schemaVersion` a second time.
export function migrateWriteFree(raw: unknown): RunManifest | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const obj = raw as { schemaVersion?: number };
  if (obj.schemaVersion === 6) return parseManifest(migrateV6toV7(raw));
  if (obj.schemaVersion === 5)
    return parseManifest(migrateV6toV7(migrateV5toV6(raw)));
  if (obj.schemaVersion === 4)
    return parseManifest(migrateV6toV7(migrateV5toV6(migrateV4toV5(raw))));
  if (obj.schemaVersion === 3)
    return parseManifest(
      migrateV6toV7(migrateV5toV6(migrateV4toV5(migrateV3toV4(raw)))),
    );
  if (obj.schemaVersion === 2)
    return parseManifest(
      migrateV6toV7(
        migrateV5toV6(migrateV4toV5(migrateV3toV4(migrateV2toV3(raw)))),
      ),
    );
  return undefined;
}

// Upgrade an on-disk manifest to the current schema. v1 stored inline CSV content and a
// single top-level element; v2 freezes the content (path+hash) and wraps it in elements[];
// v3 drops the dormant, unconvertible v2 delivery slot; v4 adds the run's route and channel
// and the proposal's excluded list; v5 widens `orient.geo.basemap` into a GeographyRef and adds
// `input.geography`/`orient.geoJoin` (geography-anywhere, D10); v6 drops a v5 admin-1 geography
// match that predates GeoMatch.featureIdsByValue (see migrateV5toV6's own comment); v7 widens
// the beat's anchor and adds three optional motion fields — nothing to rewrite, see
// migrateV6toV7's own comment. v1 chains through v2, v3, v4, v5 and v6 to v7.
export function migrate(raw: unknown, runDir: string): RunManifest {
  if (!raw || typeof raw !== "object")
    throw new Error("migrate: manifest is not an object");
  const obj = raw as { schemaVersion?: number };
  // CURRENT_SCHEMA_VERSION, never a restated literal — a hand-copied number here is exactly
  // what let a stale v5-admin1 manifest read as "already current" and skip migration entirely
  // for as long as it did (this fast path used to read the literal `5`, unmoved when v6 was
  // introduced — the review that found the resulting crash is what closed this).
  if (obj.schemaVersion === CURRENT_SCHEMA_VERSION) return parseManifest(raw);
  const writeFree = migrateWriteFree(raw);
  if (writeFree) return writeFree;
  if (obj.schemaVersion !== 1)
    throw new Error(`migrate: unsupported schemaVersion ${obj.schemaVersion}`);
  return parseManifest(
    migrateV6toV7(
      migrateV5toV6(
        migrateV4toV5(
          migrateV3toV4(
            migrateV2toV3(migrateV1toV2(raw as V1Manifest, runDir)),
          ),
        ),
      ),
    ),
  );
}

/** v6 → v7: the beat gained a wider anchor (region/place, alongside x/category) and three
 *  optional motion fields (movement, animation, durationMs — sub-project ① and ②'s own work).
 *  NOTHING in a v6 manifest becomes invalid: the anchor widening keeps "x" and "category"
 *  meaning exactly what they meant, and every new field is optional, so this migration only
 *  stamps the version. Written as a pure passthrough on purpose — a migration that rewrites
 *  data it does not have to rewrite is a migration that can corrupt it, the same discipline
 *  migrateV3toV4/migrateV4toV5 already hold for a widening. Total: no branch on `elements`,
 *  `narrative` or `beats` shape at all, so a run with no narrative, a chart-only run, a map
 *  run and an image run all pass through identically (migrate.test.ts pins the five shapes). */
export function migrateV6toV7(raw: unknown): unknown {
  return { ...(raw as object), schemaVersion: 7 };
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

// Make the run's single channel EXPLICIT on every element, as the destination + aspect pair it
// always was (issue #1). The conversion is the identity in meaning — channelForElement and
// provenanceHash both answer exactly what they answered before, which is asserted in
// migrate.test.ts — so nothing already produced goes stale. What it buys is that the manifest
// stops relying on a run-level default to say where each of its outputs goes, which is the only
// honest starting point for a run that is about to carry a second one.
//
// NOT gated on `schemaVersion`, and for the reason dropLegacyElementsDelivery above already
// records: readManifest only calls migrate() when the version DIFFERS from the current one, so a
// version-gated conversion would never run for the on-disk v4 manifests that are exactly the
// ones carrying the implicit channel. `schemaVersion` itself stays at 4 because the new fields
// are optional and additive — an old manifest parses unchanged and means the same thing.
//
// Called by the writer that plans deliverables, never silently at read time: rewriting a manifest
// as a side effect of reading it would make a resume report differ from the one taken a moment
// earlier, which lib/loop/acceptance.test.ts pins as a property of this loop.
export function materializeDeliverables(run: RunManifest): RunManifest {
  const destination = destinationOf(run.channel);
  const aspect = aspectOf(run.channel);
  return {
    ...run,
    elements: run.elements.map((el) =>
      el.deliverable ? el : { ...el, deliverable: { destination, aspect } },
    ),
  };
}

// v4's orient.geo carried a bare `basemap: string` naming one of map-native's shipped basemaps
// ("world", "us-states"). v5 widens it to a GeographyRef (geography-anywhere design D10), so a
// journalist-declared or ADM1-matched geography can be told apart from a shipped default.
const SHIPPED_GEOGRAPHY_REFS: Record<string, unknown> = {
  world: {
    origin: "shipped",
    set: "natural-earth-admin-0",
    level: "country",
    joinKey: "iso_a3",
    joinKeyFamily: "iso_a3",
  },
  "us-states": {
    origin: "shipped",
    set: "us-states",
    level: "state",
    joinKey: "postal",
    joinKeyFamily: "postal",
  },
};

// v6 adds nothing to the schema shape itself — GeoMatch.featureIdsByValue (the accent-
// normalization join fix's own field) is OPTIONAL, so a v5 manifest parses as v6 with no
// complaint on shape alone. What v6 exists to fix is a correctness gap parsing cannot catch: a
// v5 admin-1 geography match (`orient.geo.geography.set === "natural-earth-admin-1"`) that
// predates that field carries no resolved region ids at all. `lib/geo/resolve-for-produce.ts`
// now refuses LOUDLY (by design — never silently falling back to the raw-value join that IS the
// bug) rather than silently recomputing raw values against the shipped file when
// featureIdsByValue is missing on an admin-1 join — and an uncaught refusal reaching a
// read-only host command (lib/host/state.ts's loadRun) breaks that file's own "never throws"
// promise.
//
// There is no way to recompute the resolved ids from the persisted GeoMatch alone: it never
// stored the per-row raw values, only the aggregate matched/unmatched counts, and re-deriving
// them needs the frozen CSV — reading it here would violate this leg's own write-free contract
// (migrateWriteFree, the one the read-only state/next commands rely on, takes no `runDir` and
// touches no filesystem at all). So a stale admin-1 match is DROPPED instead of migrated
// forward: `orient` (not just `orient.geo`) is removed entirely, which reuses the EXISTING,
// already-tested "needs orient" gate (`nextActions`'s own `if (!run.orient) return ["orient"]`,
// lib/loop/manifest.ts) rather than inventing a new one. Re-running orient recomputes profile
// AND geo fresh, this time WITH featureIdsByValue (matchAdm1Index always sets it now) — the
// same self-healing path a run that has not reached orient yet already takes, and it does not
// disturb anything downstream: nextActions checks `!run.orient` FIRST, before any
// proposal/produce state, so a run that had already progressed past orient simply redoes that
// one step and continues exactly as if resuming a run that had not oriented yet.
//
// Every other v5 manifest is untouched: no admin-1 match at all, or an admin-1 match that
// ALREADY carries featureIdsByValue (possible for a run created between the field's own commit
// and this version bump).
function migrateV5toV6(v5: unknown): unknown {
  const m = v5 as {
    orient?: {
      geo?: {
        geography?: { set?: string };
        featureIdsByValue?: unknown;
      };
    };
  };
  const staleAdm1Match =
    m.orient?.geo?.geography?.set === "natural-earth-admin-1" &&
    m.orient.geo.featureIdsByValue === undefined;
  if (!staleAdm1Match) return { ...(v5 as object), schemaVersion: 6 };
  const { orient: _droppedOrient, ...rest } = v5 as Record<string, unknown>;
  return { ...rest, schemaVersion: 6 };
}

// Translates the two shipped basemap names the same way lib/geo/ref.ts's resolveGeographyRef
// does — duplicated here (not imported) because migrate.ts must keep working against every past
// schema shape even if lib/geo/ref.ts's own defaults ever change; a migration is a snapshot of
// what a name meant AT THAT VERSION, not a live lookup.
function migrateV4toV5(v4: unknown): unknown {
  const m = v4 as {
    orient?: { geo?: { basemap?: string } & Record<string, unknown> };
  };
  if (!m.orient?.geo) return { ...(v4 as object), schemaVersion: 5 };
  const { basemap, ...rest } = m.orient.geo;
  const geography = basemap ? SHIPPED_GEOGRAPHY_REFS[basemap] : undefined;
  return {
    ...(v4 as object),
    schemaVersion: 5,
    orient: {
      ...m.orient,
      geo: { ...rest, ...(geography ? { geography } : {}) },
    },
  };
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
