import { test, expect, it, describe } from "bun:test";
import { mkdtempSync, existsSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  migrate,
  migrateWriteFree,
  migrateV6toV7,
  materializeDeliverables,
} from "./migrate";
import {
  parseManifest,
  channelForElement,
  provenanceHash,
  nextActions,
  readManifest,
} from "./manifest";
import { freezeInput } from "./freeze";

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
  expect(m.schemaVersion).toBe(7);
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
  expect(out.schemaVersion).toBe(7);
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
  expect(m.schemaVersion).toBe(7);
  expect(m.route).toBe("embed");
  expect(m.channel).toBe("article-web");
  expect(m.elements[0].proposal!.excluded).toEqual([]);
});

// --- issue #1: making an implicit single channel explicit, without changing what it means ---
// legacyRun is a CURRENT-schema fixture (fed straight to parseManifest, never migrate()), not a
// v4-shaped one — its name predates schemaVersion 5, 6 (and now 7) and refers to the run's
// implicit channel, not to any past schema version.
const legacyRun = (
  channel: "article-web" | "social-vertical" | "social-feed",
) => ({
  runId: "r9",
  schemaVersion: 7 as const,
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
    expect(migrated.schemaVersion).toBe(7);
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

  it("passes through a v4 manifest with no orient.geo at all, unaltered but at v7", () => {
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
    expect(migrated.schemaVersion).toBe(7);
    expect(migrated.orient).toBeUndefined();
  });
});

describe("migrateV5toV6 — the accent-normalization join fix's own migration (Task 15 follow-up review round 1)", () => {
  // The reviewer's own repro: a v5 manifest shaped exactly like a real pre-fix admin-1 run
  // (matched via the offline ADM1 index before featureIdsByValue existed) used to parse clean
  // at "current" (schemaVersion stayed 5, so readManifest's version-diff gate never fired) and
  // then crash produce with an UNCAUGHT throw — this is the manifest that must now come back
  // readable, with `orient` dropped so the run re-derives it (and this time gets
  // featureIdsByValue).
  const staleAdm1V5 = {
    runId: "r1",
    schemaVersion: 5,
    route: "embed",
    channel: "article-web",
    input: { data: { path: "input/data-abc.csv", sha256: "a".repeat(64) } },
    orient: {
      profile: { columns: ["canton"], numericColumns: ["rent"], rowCount: 1 },
      supportsPoint: true,
      geo: {
        column: "canton",
        geography: {
          origin: "shipped",
          set: "natural-earth-admin-1",
          scope: "CHE",
          level: "canton",
          joinKey: "name",
          joinKeyFamily: "name",
        },
        matched: 1,
        total: 1,
        unmatched: [],
        // featureIdsByValue deliberately absent — the exact shape a real run written before
        // this field existed carries.
      },
    },
    elements: [
      {
        id: "e1",
        angle: { confirmedTakeaway: "t", altInsight: "a", unit: "CHF" },
        proposal: {
          options: [{ id: "choropleth", nativeType: "choropleth", why: "w" }],
          excluded: [],
          chosenId: "choropleth",
        },
      },
    ],
    events: [],
  };

  it("drops orient entirely for a stale v5 admin-1 match — parses clean, at v7, orient gone", () => {
    const migrated = migrate(staleAdm1V5, "/tmp/does-not-matter");
    expect(() => parseManifest(migrated)).not.toThrow();
    expect(migrated.schemaVersion).toBe(7);
    expect(migrated.orient).toBeUndefined();
  });

  it("leaves the rest of the element (proposal, angle) untouched — only orient is reset, not the whole run", () => {
    const migrated = migrate(staleAdm1V5, "/tmp/does-not-matter");
    expect(migrated.elements[0]!.proposal?.chosenId).toBe("choropleth");
    expect(migrated.elements[0]!.angle?.confirmedTakeaway).toBe("t");
  });

  it("nextActions asks for 'orient' again on the migrated run — the catchable, already-tested next-action path, not a crash", () => {
    const migrated = migrate(staleAdm1V5, "/tmp/does-not-matter");
    const run = parseManifest(migrated);
    expect(nextActions(run)).toEqual(["orient"]);
  });

  it("leaves a v5 admin-1 match that ALREADY carries featureIdsByValue untouched — only the STALE shape is dropped", () => {
    const freshAdm1V5 = {
      ...staleAdm1V5,
      orient: {
        ...staleAdm1V5.orient,
        geo: {
          ...staleAdm1V5.orient.geo,
          featureIdsByValue: {
            Genève: [{ featureId: "CHE-159", country: "CHE" }],
          },
        },
      },
    };
    const migrated = migrate(freshAdm1V5, "/tmp/does-not-matter");
    expect(migrated.schemaVersion).toBe(7);
    expect(migrated.orient).toBeDefined();
    expect(
      (migrated.orient as { geo?: { featureIdsByValue?: unknown } }).geo
        ?.featureIdsByValue,
    ).toBeDefined();
  });

  it("leaves a v5 manifest with a non-admin-1 (or no) geography match untouched", () => {
    const worldV5 = {
      ...staleAdm1V5,
      orient: {
        ...staleAdm1V5.orient,
        geo: {
          column: "country",
          geography: {
            origin: "shipped",
            set: "natural-earth-admin-0",
            level: "country",
            joinKey: "iso_a3",
            joinKeyFamily: "iso_a3",
          },
          matched: 1,
          total: 1,
          unmatched: [],
        },
      },
    };
    const migrated = migrate(worldV5, "/tmp/does-not-matter");
    expect(migrated.schemaVersion).toBe(7);
    expect(migrated.orient).toBeDefined();
  });

  it("migrateWriteFree (the read-only state/next path) drops the same stale match in memory, with no write", () => {
    const migrated = migrateWriteFree(staleAdm1V5);
    expect(migrated).toBeDefined();
    expect(migrated!.schemaVersion).toBe(7);
    expect(migrated!.orient).toBeUndefined();
  });
});

describe("migrateV6toV7 — the unified beat model's own migration (sub-project ①/②)", () => {
  test("migrateV6toV7 is total: it alters no run that carries no beats", () => {
    const noOrient = { schemaVersion: 6, elements: [] };
    expect(migrateV6toV7(noOrient)).toEqual({ ...noOrient, schemaVersion: 7 });
  });

  test("a v6 run WITH beats keeps every beat byte-identical", () => {
    const withBeats = {
      schemaVersion: 6,
      elements: [
        {
          id: "e1",
          narrative: {
            beats: [
              {
                id: "b1",
                anchor: { kind: "x", value: "2019" },
                role: "establish",
                text: "t",
                draftText: "d",
                beatSource: { facts: {}, shared: {} },
              },
            ],
          },
        },
      ],
    };
    // The three new fields are OPTIONAL — migration adds nothing, it only stamps the version.
    expect(migrateV6toV7(withBeats)).toEqual({
      ...withBeats,
      schemaVersion: 7,
    });
  });

  test("a chart-only run, a map run and an image run all pass through unaltered", () => {
    for (const el of [
      { id: "c", producer: "chart-native" },
      { id: "m", producer: "map-native" },
      { id: "i", producer: "image-native" },
    ]) {
      const run = { schemaVersion: 6, elements: [el] };
      expect(migrateV6toV7(run)).toEqual({ ...run, schemaVersion: 7 });
    }
  });

  test("the chain v4 → v5 → v6 → v7 composes", () => {
    const v4 = {
      runId: "r1",
      schemaVersion: 4,
      route: "embed",
      channel: "article-web",
      input: {},
      elements: [],
      events: [],
    };
    const out = migrate(v4, "/tmp/does-not-matter");
    expect(out.schemaVersion).toBe(7);
  });

  // The three tests above call migrateV6toV7 DIRECTLY — nothing proves the v6 entry branch of
  // migrateWriteFree/migrate is actually wired up. This is the seam that let 5→6 crash a
  // producer (a stale manifest read as "already current" and never reached its migration): a
  // raw v6 run.json, on disk, read the way a resuming host process actually reads one.
  //
  // M1 (whole-branch review): this fixture used to carry NO `narrative` at all, so the ONLY
  // place a v6 beat's shape was ever asserted was "a v6 run WITH beats keeps every beat
  // byte-identical" above — which calls migrateV6toV7 directly and asserts
  // `toEqual({...withBeats, schemaVersion: 7})` against an implementation that IS
  // `return {...raw, schemaVersion: 7}`. That assertion restates the implementation; it
  // cannot redden for any beat shape. The two v6-beat tests never intersected, so nothing in
  // the repository proved a beat with a populated `beatSource` survives the REAL entry
  // (readManifest → migrate → parseManifest, which also validates against
  // NarrativeBeatSchema — a check the direct-call tests never exercise at all). Added here
  // instead of only widening the direct-call fixture, because this is the path a resuming
  // host process actually takes.
  test("a v6 run.json on disk resumes through readManifest — the real entry, not migrateV6toV7 called directly", () => {
    const runDir = mkdtempSync(join(tmpdir(), "loop-mig-v6-resume-"));
    const src = join(runDir, "src.csv");
    writeFileSync(src, "canton,2015,2024\nGenève,449,583");
    const data = freezeInput(runDir, src, "data");
    const beats = [
      {
        id: "b1",
        anchor: { kind: "x", value: "2015" },
        role: "establish",
        text: "Genève held steady",
        draftText: "Genève — 449",
        beatSource: {
          facts: { x: "2015", value: "449" },
          shared: { points: "2", first: "449", last: "583" },
        },
      },
    ];
    const v6 = {
      runId: "r-v6",
      schemaVersion: 6,
      route: "embed",
      channel: "article-web",
      input: { data },
      orient: {
        profile: {
          columns: ["canton", "2015", "2024"],
          numericColumns: ["2015", "2024"],
          rowCount: 1,
        },
        supportsPoint: true,
      },
      elements: [
        {
          id: "e1",
          angle: { confirmedTakeaway: "t", altInsight: "a", unit: "CHF" },
          proposal: {
            options: [{ id: "slope", nativeType: "slope", why: "w" }],
            excluded: [],
            chosenId: "slope",
          },
          narrative: { beats },
        },
      ],
      events: [],
    };
    const manifestPath = join(runDir, "run.json");
    writeFileSync(manifestPath, JSON.stringify(v6, null, 2));
    const run = readManifest(manifestPath, runDir);
    expect(run.schemaVersion).toBe(7);
    expect(nextActions(run)).toEqual(["produce"]);
    // The actual M1 proof: a v6 beat with a populated beatSource, round-tripped through the
    // real resume path, comes back byte-identical — not just "the version stamp changed".
    expect(run.elements[0]!.narrative?.beats).toEqual(beats);
    rmSync(runDir, { recursive: true, force: true });
  });
});
