import { test, expect, it, describe } from "bun:test";
import { mkdtempSync, existsSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { migrate, materializeDeliverables } from "./migrate";
import { parseManifest, channelForElement, provenanceHash } from "./manifest";

const v1 = {
  runId: "r1",
  schemaVersion: 1,
  input: {
    dataCsv: "canton,2015,2024\nGenève,449,583",
    statedPoint: "premiums rose",
  },
  orient: {
    profile: {
      columns: ["canton", "2015", "2024"],
      numericColumns: ["2015", "2024"],
      rowCount: 1,
    },
    supportsPoint: true,
  },
  angle: { confirmedTakeaway: "t", altInsight: "a", unit: "CHF" },
  proposal: {
    options: [{ id: "slope", nativeType: "slope", why: "w" }],
    chosenId: "slope",
  },
  artifact: { path: "/old/static.png", provenanceHash: "old" },
};

test("migrate upgrades a v1 manifest to a valid current-schema manifest", () => {
  const runDir = mkdtempSync(join(tmpdir(), "loop-mig-"));
  const m = migrate(v1, runDir);
  expect(() => parseManifest(m)).not.toThrow();
  expect(m.schemaVersion).toBe(5);
});

test("migrate freezes the v1 inline dataCsv into the run dir", () => {
  const runDir = mkdtempSync(join(tmpdir(), "loop-mig-"));
  const m = migrate(v1, runDir);
  expect(m.input.data).toBeDefined();
  expect(existsSync(join(runDir, m.input.data!.path))).toBe(true);
});

test("migrate wraps the single v1 element into elements[0]", () => {
  const runDir = mkdtempSync(join(tmpdir(), "loop-mig-"));
  const m = migrate(v1, runDir);
  expect(m.elements).toHaveLength(1);
  expect(m.elements[0].angle?.confirmedTakeaway).toBe("t");
  expect(m.elements[0].proposal?.chosenId).toBe("slope");
});

test("migrate refuses an unknown / newer schema version", () => {
  const runDir = mkdtempSync(join(tmpdir(), "loop-mig-"));
  expect(() => migrate({ ...v1, schemaVersion: 99 }, runDir)).toThrow();
});

test("migrate refuses a non-object manifest with a clean message", () => {
  const runDir = mkdtempSync(join(tmpdir(), "loop-mig-"));
  expect(() => migrate(null, runDir)).toThrow(
    "migrate: manifest is not an object",
  );
});

test("migrate drops the stale v1 artifact rather than carrying its absolute path forward", () => {
  const runDir = mkdtempSync(join(tmpdir(), "loop-mig-"));
  const m = migrate(v1, runDir);
  expect(m.elements[0].artifact).toBeUndefined();
});

it("should drop the dormant v2 delivery slot rather than carry an unconvertible shape forward", () => {
  const dir = mkdtempSync(join(tmpdir(), "loop-mig-v3-"));
  const v2 = {
    runId: "r1",
    schemaVersion: 2,
    input: { data: { path: "input/data.csv", sha256: "abc" } },
    elements: [
      {
        id: "e1",
        delivery: {
          requested: ["embed"],
          delivered: [{ path: "x", sha256: "y" }],
        },
      },
    ],
    events: [],
  };
  writeFileSync(join(dir, "input.csv"), "a\n1\n");
  const out = migrate(v2, dir);
  expect(out.schemaVersion).toBe(5);
  expect(out.elements[0]!.delivery).toBeUndefined();
  rmSync(dir, { recursive: true, force: true });
});

test("a v3 manifest migrates through v4 to the current schema, with the embed route and the web channel", () => {
  const dir = mkdtempSync(join(tmpdir(), "mig-v4-"));
  const v3 = {
    runId: "r",
    schemaVersion: 3,
    input: {},
    elements: [{ id: "e1", proposal: { options: [], chosenId: undefined } }],
    events: [],
  };
  const m = migrate(v3, dir);
  expect(m.schemaVersion).toBe(5);
  expect(m.route).toBe("embed");
  expect(m.channel).toBe("article-web");
  expect(m.elements[0].proposal!.excluded).toEqual([]);
});

// --- issue #1: making an implicit single channel explicit, without changing what it means ---
// legacyRun is a CURRENT-schema fixture (fed straight to parseManifest, never migrate()), not a
// v4-shaped one — its name predates schemaVersion 5 and refers to the run's implicit channel,
// not to any past schema version.
const legacyRun = (
  channel: "article-web" | "social-vertical" | "social-feed",
) => ({
  runId: "r9",
  schemaVersion: 5 as const,
  route: "embed" as const,
  channel,
  input: { data: { path: "input/data.csv", sha256: "a".repeat(64) } },
  orient: {
    profile: { columns: ["c", "v"], numericColumns: ["v"], rowCount: 3 },
    supportsPoint: true,
  },
  elements: [
    {
      id: "e1",
      angle: { confirmedTakeaway: "t", altInsight: "a", unit: "u" },
      proposal: {
        options: [{ id: "slope", nativeType: "slope", why: "w" }],
        excluded: [],
        chosenId: "slope",
      },
    },
  ],
  events: [],
});

it("writes down the destination and aspect a single-channel run always meant", () => {
  const run = parseManifest(legacyRun("social-vertical"));
  const after = materializeDeliverables(run);
  expect(after.elements[0]!.deliverable).toEqual({
    destination: "social",
    aspect: "portrait",
  });
});

it("changes nothing that anything downstream reads — same channel, same provenance", () => {
  for (const ch of ["article-web", "social-vertical", "social-feed"] as const) {
    const run = parseManifest(legacyRun(ch));
    const after = materializeDeliverables(run);
    expect(channelForElement(after, after.elements[0]!)).toBe(
      channelForElement(run, run.elements[0]!),
    );
    // The whole point: an artifact already on disk must NOT go stale just because the run
    // learned to say out loud what it already meant.
    expect(provenanceHash(after, after.elements[0]!)).toBe(
      provenanceHash(run, run.elements[0]!),
    );
  }
});

it("leaves an element that already declares a deliverable alone", () => {
  const run = parseManifest({
    ...legacyRun("article-web"),
    elements: [
      {
        ...legacyRun("article-web").elements[0]!,
        deliverable: { destination: "print" },
      },
    ],
  });
  const after = materializeDeliverables(run);
  expect(after.elements[0]!.deliverable).toEqual({ destination: "print" });
});

it("carries a v1 manifest all the way to an explicit web deliverable", () => {
  const runDir = mkdtempSync(join(tmpdir(), "loop-mig-deliv-"));
  const migrated = migrate(v1, runDir);
  const after = materializeDeliverables(migrated);
  expect(after.elements[0]!.deliverable).toEqual({
    destination: "article-web",
    aspect: "landscape",
  });
  rmSync(runDir, { recursive: true, force: true });
});

describe("migrateV4toV5", () => {
  it("translates orient.geo.basemap 'world' into a GeographyRef — the exact translation the spec names", () => {
    const v4 = {
      runId: "r1",
      schemaVersion: 4,
      route: "embed",
      channel: "article-web",
      input: { data: { path: "input/data-abc.csv", sha256: "abc" } },
      orient: {
        profile: { columns: ["country"], numericColumns: [], rowCount: 1 },
        supportsPoint: false,
        geo: {
          column: "country",
          basemap: "world",
          matched: 1,
          total: 1,
          unmatched: [],
        },
      },
      elements: [],
      events: [],
    };
    const migrated = migrate(v4, "/tmp/does-not-matter");
    expect(migrated.schemaVersion).toBe(5);
    expect(migrated.orient?.geo?.geography).toEqual({
      origin: "shipped",
      set: "natural-earth-admin-0",
      level: "country",
      joinKey: "iso_a3",
      joinKeyFamily: "iso_a3",
    });
    expect(
      (migrated.orient?.geo as unknown as { basemap?: string }).basemap,
    ).toBeUndefined();
  });

  it("translates 'us-states' the same way", () => {
    const v4 = {
      runId: "r1",
      schemaVersion: 4,
      route: "embed",
      channel: "article-web",
      input: {},
      orient: {
        profile: { columns: ["state"], numericColumns: [], rowCount: 1 },
        supportsPoint: false,
        geo: {
          column: "state",
          basemap: "us-states",
          matched: 1,
          total: 1,
          unmatched: [],
        },
      },
      elements: [],
      events: [],
    };
    const migrated = migrate(v4, "/tmp/does-not-matter");
    expect(migrated.orient?.geo?.geography.set).toBe("us-states");
  });

  it("passes through a v4 manifest with no orient.geo at all, unaltered but at v5", () => {
    const v4 = {
      runId: "r1",
      schemaVersion: 4,
      route: "embed",
      channel: "article-web",
      input: {},
      elements: [],
      events: [],
    };
    const migrated = migrate(v4, "/tmp/does-not-matter");
    expect(migrated.schemaVersion).toBe(5);
    expect(migrated.orient).toBeUndefined();
  });
});
