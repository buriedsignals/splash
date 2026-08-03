import { test, expect } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { initRun } from "./init";
import { CURRENT_SCHEMA_VERSION, nextActions, readManifest } from "./manifest";

// A run directory with a CSV beside it, ready to be declared. Nothing is frozen yet: freezing
// is exactly what initRun does, and a test that pre-froze would be testing the fixture.
function scene(): { dir: string; csv: string } {
  const dir = mkdtempSync(join(tmpdir(), "loop-init-"));
  const csv = join(dir, "premiums.csv");
  writeFileSync(csv, "canton,2015,2024\nGenève,449,583\nVaud,412,531\n");
  return { dir, csv };
}

function declaration(csv: string): Record<string, unknown> {
  return {
    runId: "premiums",
    input: { data: csv },
    sources: {
      mode: "real",
      data: { kind: "local", label: "Relevés cantonaux 2024" },
    },
  };
}

test("initRun writes a readable run whose frozen input hashes to the source bytes", () => {
  const { dir, csv } = scene();
  const created = initRun(dir, declaration(csv));
  expect(created.ok).toBe(true);

  const run = readManifest(join(dir, "run.json"), dir);
  expect(run.runId).toBe("premiums");
  expect(run.input.data).toBeDefined();
  const frozen = join(dir, run.input.data!.path);
  expect(existsSync(frozen)).toBe(true);
  expect(readFileSync(frozen, "utf8")).toBe(readFileSync(csv, "utf8"));
  expect(run.input.data!.sha256).toMatch(/^[0-9a-f]{64}$/);
});

test("initRun defaults route, channel, one element, an empty ledger of events", () => {
  const { dir, csv } = scene();
  expect(initRun(dir, declaration(csv)).ok).toBe(true);
  const run = readManifest(join(dir, "run.json"), dir);
  expect(run.schemaVersion).toBe(6);
  expect(run.route).toBe("embed");
  expect(run.channel).toBe("article-web");
  expect(run.elements).toEqual([{ id: "el1" }]);
  expect(run.events).toEqual([]);
});

// The schema's own version number, never restated as a hardcoded literal at the write site —
// the exact defect class Task 9 closed for lib/host/state.ts's stale-schema gate. Comparing
// against the imported constant, not a literal 5, means this test does not need editing on the
// next schema bump AND would immediately catch init.ts falling behind if the import/usage were
// ever reverted to a literal.
test("initRun writes a manifest at CURRENT_SCHEMA_VERSION, not a restated literal", () => {
  const { dir, csv } = scene();
  expect(initRun(dir, declaration(csv)).ok).toBe(true);
  const run = readManifest(join(dir, "run.json"), dir);
  expect(run.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
});

test("a run initRun created owes exactly one thing: orient", () => {
  const { dir, csv } = scene();
  expect(initRun(dir, declaration(csv)).ok).toBe(true);
  expect(nextActions(readManifest(join(dir, "run.json"), dir))).toEqual([
    "orient",
  ]);
});

test("initRun carries the declared channel, route, element id and requested format", () => {
  const { dir, csv } = scene();
  const result = initRun(dir, {
    ...declaration(csv),
    route: "article",
    channel: "social-vertical",
    elements: [{ id: "hero", requestedFormat: "static" }],
  });
  expect(result.ok).toBe(true);
  const run = readManifest(join(dir, "run.json"), dir);
  expect(run.route).toBe("article");
  expect(run.channel).toBe("social-vertical");
  expect(run.elements[0]).toEqual({ id: "hero", requestedFormat: "static" });
  expect(run.sources!.data!.label).toBe("Relevés cantonaux 2024");
});

test("initRun refuses an unknown field by naming it, and writes nothing", () => {
  const { dir, csv } = scene();
  const result = initRun(dir, { ...declaration(csv), chanel: "article-web" });
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error("unreachable");
  expect(result.code).toBe("invalid-request");
  expect(result.message).toContain("chanel");
  expect(existsSync(join(dir, "run.json"))).toBe(false);
  expect(existsSync(join(dir, "input"))).toBe(false);
});

// The point of the whole command: init creates a run at gate state `empty`, and every field
// after that is EARNED by a command with its own refusals. A declaration that could carry an
// angle, an offer or an artifact would be the hand-edited run.json under another name.
for (const earned of [
  { angle: { confirmedTakeaway: "t", altInsight: "a", unit: "%" } },
  { proposal: { options: [], excluded: [] } },
  {
    artifact: {
      path: "x.png",
      sha256: "y",
      provenanceHash: "z",
      producedAt: "now",
    },
  },
  { delivery: { requested: ["zip"], delivered: [] } },
]) {
  const field = Object.keys(earned)[0]!;
  test(`initRun refuses a declaration carrying an element's ${field}`, () => {
    const { dir, csv } = scene();
    const result = initRun(dir, {
      ...declaration(csv),
      elements: [{ id: "el1", ...earned }],
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.message).toContain(field);
    expect(existsSync(join(dir, "run.json"))).toBe(false);
  });
}

for (const earned of [
  {
    orient: {
      profile: { columns: [], numericColumns: [], rowCount: 0 },
      supportsPoint: true,
    },
  },
  { events: [] },
  { cadrage: { answers: {} } },
]) {
  const field = Object.keys(earned)[0]!;
  test(`initRun refuses a declaration carrying the run's ${field}`, () => {
    const { dir, csv } = scene();
    const result = initRun(dir, { ...declaration(csv), ...earned });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.message).toContain(field);
  });
}

test("initRun refuses a declaration with no input at all", () => {
  const { dir } = scene();
  const result = initRun(dir, { runId: "empty", input: {} });
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error("unreachable");
  expect(result.message).toMatch(/input/i);
});

test("initRun refuses a blank runId", () => {
  const { dir, csv } = scene();
  const result = initRun(dir, { ...declaration(csv), runId: "   " });
  expect(result.ok).toBe(false);
});

test("initRun never overwrites an existing run — the manifest is the ledger", () => {
  const { dir, csv } = scene();
  expect(initRun(dir, declaration(csv)).ok).toBe(true);
  const before = readFileSync(join(dir, "run.json"));

  const second = initRun(dir, { ...declaration(csv), runId: "other" });
  expect(second.ok).toBe(false);
  if (second.ok) throw new Error("unreachable");
  expect(second.message).toContain("run.json");
  expect(readFileSync(join(dir, "run.json"))).toEqual(before);
});

// `sources` is written exactly ONCE, here: no later step of the loop can add it, so a run that
// begins without a data ledger reaches produce and stops there for good. The refusal therefore
// belongs to the declaration, and it carries the question it owes rather than only a diagnosis.
test("initRun refuses a data input whose source is not declared, and writes nothing", () => {
  const { dir, csv } = scene();
  const result = initRun(dir, { runId: "undeclared", input: { data: csv } });
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error("unreachable");
  expect(result.code).toBe("invalid-request");
  expect(result.message).toContain("sources.data");
  expect(result.message).toContain("Where does this data come from");
  expect(existsSync(join(dir, "run.json"))).toBe(false);
  expect(existsSync(join(dir, "input"))).toBe(false);
});

test("initRun accepts an article-only run with no data ledger", () => {
  // The rule is about the DATA slot: an article input carries no figures of its own, and
  // requiring a ledger for it would refuse a legitimate run.
  const { dir } = scene();
  const article = join(dir, "piece.txt");
  writeFileSync(article, "Les primes ont augmenté dans les six cantons.\n");
  const result = initRun(dir, { runId: "article-only", input: { article } });
  expect(result.ok).toBe(true);
});

test("initRun refuses an input path that does not exist, before freezing anything", () => {
  const { dir } = scene();
  const result = initRun(dir, {
    runId: "missing",
    input: { data: join(dir, "nope.csv") },
    // Declared, because the loop no longer creates a run whose data says nothing about itself —
    // this fixture is about the PATH, and it has to clear every earlier gate to reach it.
    sources: {
      mode: "real",
      data: { kind: "local", label: "Relevés cantonaux 2024" },
    },
  });
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error("unreachable");
  expect(result.message).toContain("nope.csv");
  expect(existsSync(join(dir, "input"))).toBe(false);
});

// The ORDER of §1.2, made mechanical: the ledger is judged before a byte is written, so an
// illegal declaration cannot leave a frozen input orphaned in a directory with no run.json.
test("initRun refuses an illegal source ledger without freezing the input", () => {
  const { dir, csv } = scene();
  const result = initRun(dir, {
    runId: "fabricated",
    input: { data: csv },
    sources: { mode: "real", data: { kind: "synthetic", label: "made up" } },
  });
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error("unreachable");
  expect(existsSync(join(dir, "input"))).toBe(false);
  expect(existsSync(join(dir, "run.json"))).toBe(false);
});

// Splash never generates a photograph, and never writes its alt or credit — the journalist's
// suggest-image skill asks for both and refuses to fill them in. A run can only carry the
// photographs it was GIVEN, each with the alt and credit that came with it.
function imagesDecl(dir: string): Record<string, unknown> {
  return {
    dir,
    frames: [
      {
        frameRef: "01.jpg",
        alt: "A flooded street, cars submerged to the roof",
        credit: { name: "M. Rossi" },
      },
      {
        frameRef: "02.jpg",
        alt: "The same street, dry, two years later",
        credit: { name: "M. Rossi" },
      },
    ],
  };
}

test("a run can declare a folder of the journalist's images, each with its alt and credit", () => {
  const { dir, csv } = scene();
  const result = initRun(dir, {
    ...declaration(csv),
    input: { data: csv, images: imagesDecl("/abs/photos") },
  });
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("unreachable");
  expect(result.value.input.images?.dir).toBe("/abs/photos");
  expect(result.value.input.images?.frames).toHaveLength(2);
  expect(result.value.input.images?.frames[0]).toEqual({
    frameRef: "01.jpg",
    alt: "A flooded street, cars submerged to the roof",
    credit: { name: "M. Rossi" },
  });
});

test("an image declared without an alt is refused — Splash never writes one", () => {
  const { dir, csv } = scene();
  const images = imagesDecl("/abs/photos");
  (images.frames as Record<string, unknown>[])[0]!.alt = "";
  const result = initRun(dir, {
    ...declaration(csv),
    input: { data: csv, images },
  });
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error("unreachable");
  expect(result.message).toContain("alt");
  expect(existsSync(join(dir, "run.json"))).toBe(false);
});

test("an image declared without a credit is refused — a photo carries its photographer", () => {
  const { dir, csv } = scene();
  const images = imagesDecl("/abs/photos");
  (images.frames as Record<string, unknown>[])[0]!.credit = { name: "" };
  const result = initRun(dir, {
    ...declaration(csv),
    input: { data: csv, images },
  });
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error("unreachable");
  expect(result.message).toContain("credit");
  expect(existsSync(join(dir, "run.json"))).toBe(false);
});

// The same three shapes skills/image-native/src/image-story.ts's checkImageConformance
// refuses at build time — refused one layer earlier, at declaration, so the bad value never
// lands in a manifest on disk in the first place.
for (const escaping of [
  "../../etc/passwd",
  "/etc/passwd",
  "C:\\Windows\\win.ini",
]) {
  test(`a frameRef "${escaping}" that escapes the image folder is refused`, () => {
    const { dir, csv } = scene();
    const images = imagesDecl("/abs/photos");
    (images.frames as Record<string, unknown>[])[0]!.frameRef = escaping;
    const result = initRun(dir, {
      ...declaration(csv),
      input: { data: csv, images },
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("unreachable");
    expect(result.message).toContain(
      "must be a plain path INSIDE the image folder",
    );
    expect(existsSync(join(dir, "run.json"))).toBe(false);
  });
}

// --- the language the run's deliverables are made in --------------------------------------
//
// No detection anywhere in this repo, and none added here (spec §5). The step that reads the
// article DECLARES the language it read there; initRun resolves that declaration, together
// with the house profile passed in by the caller, into the ONE language the run records.

test("records the language the article was declared to be in", () => {
  const { dir, csv } = scene();
  const r = initRun(dir, {
    ...declaration(csv),
    input: { data: csv, articleLang: "it" },
  });
  expect(r.ok).toBe(true);
  if (r.ok) expect(r.value.lang).toBe("it");
});

test("falls back to the house profile only when no article language was declared", () => {
  const { dir, csv } = scene();
  const r = initRun(dir, declaration(csv), { profileLang: "fr" });
  expect(r.ok).toBe(true);
  if (r.ok) expect(r.value.lang).toBe("fr");
});

test("does not let the house profile overwrite the article's language", () => {
  const { dir, csv } = scene();
  const r = initRun(
    dir,
    { ...declaration(csv), input: { data: csv, articleLang: "en" } },
    { profileLang: "fr" },
  );
  expect(r.ok).toBe(true);
  if (r.ok) expect(r.value.lang).toBe("en");
});

// The identity claim: a run that declares no article language and is initialised with no house
// profile either records NOTHING — the manifest stays byte-identical to one written before this
// field existed, rather than growing a `"lang": "en"` nobody established.
test("writes no lang field at all when nothing was declared and no profile was given", () => {
  const { dir, csv } = scene();
  const r = initRun(dir, declaration(csv));
  expect(r.ok).toBe(true);
  if (r.ok) expect(r.value.lang).toBeUndefined();
  const raw = readFileSync(join(dir, "run.json"), "utf8");
  expect(raw).not.toContain('"lang"');
});

// --- geography input (D1, D1b): frozen like data/article, a HashRef plus the editorial facts
// GeographyInputSchema carries.

test("accepts a run declaring input.geography and freezes it", () => {
  const { dir, csv } = scene();
  const geoFixture = join(dir, "cantons.geojson");
  writeFileSync(
    geoFixture,
    JSON.stringify({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: [7.4474, 46.9481] },
        },
      ],
    }),
  );
  const result = initRun(dir, {
    ...declaration(csv),
    input: {
      data: csv,
      geography: {
        path: geoFixture,
        encoding: "geojson",
        crs: "EPSG:4326",
        level: "cantons",
        licence: "swisstopo",
        edition: "2024",
        credit: { name: "swisstopo" },
      },
    },
  });
  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.value.input.geography?.sha256).toBeDefined();
    expect(result.value.input.geography?.level).toBe("cantons");
  }
  // The WRITTEN file, not just the in-memory return — the same discipline every other test in
  // this file that cares about persisted state follows (readManifest re-parses through
  // RunManifestSchema, so a shape writeManifest let through wrong would fail here even if the
  // in-memory `result.value` above looked fine).
  const run = readManifest(join(dir, "run.json"), dir);
  expect(run.input.geography?.encoding).toBe("geojson");
  expect(run.input.geography?.crs).toBe("EPSG:4326");
  expect(run.input.geography?.level).toBe("cantons");
  expect(run.input.geography?.licence).toBe("swisstopo");
  expect(run.input.geography?.edition).toBe("2024");
  expect(run.input.geography?.credit.name).toBe("swisstopo");
  expect(run.input.geography?.sha256).toMatch(/^[0-9a-f]{64}$/);
  expect(run.input.geography?.path).toMatch(
    /^input\/geography-[0-9a-f]{16}\.geojson$/,
  );
});

// The no-geography case must stay legal AND avoid materializing a phantom record: `optional()`
// on a zod object can, depending on how the surrounding object is built, still serialize an
// absent key as `undefined`-but-present or even `null` rather than dropping it — this is the
// check that the field is genuinely MISSING from the written bytes, not merely undefined in the
// parsed TS shape.
test("a run declared without input.geography round-trips with the field genuinely absent, not null or an empty record", () => {
  const { dir, csv } = scene();
  expect(initRun(dir, declaration(csv)).ok).toBe(true);

  const run = readManifest(join(dir, "run.json"), dir);
  expect(run.input.geography).toBeUndefined();
  expect("geography" in run.input).toBe(false);

  const raw = JSON.parse(readFileSync(join(dir, "run.json"), "utf8"));
  expect("geography" in raw.input).toBe(false);
  expect(readFileSync(join(dir, "run.json"), "utf8")).not.toContain(
    '"geography"',
  );
});

// Mirrors "initRun refuses an input path that does not exist, before freezing anything" (above)
// for the geography slot — the same existence check, extended to a third input.
test("initRun refuses a geography path that does not exist, before freezing anything", () => {
  const { dir, csv } = scene();
  const result = initRun(dir, {
    ...declaration(csv),
    input: {
      data: csv,
      geography: {
        path: join(dir, "nope.geojson"),
        encoding: "geojson",
        crs: "EPSG:4326",
        level: "cantons",
        licence: "swisstopo",
        edition: "2024",
        credit: { name: "swisstopo" },
      },
    },
  });
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error("unreachable");
  expect(result.message).toContain("nope.geojson");
  expect(existsSync(join(dir, "input"))).toBe(false);
  expect(existsSync(join(dir, "run.json"))).toBe(false);
});

// The CRS guard (lib/geo/crs.ts, Task 1) runs before a single byte is frozen — same fixture
// crs.test.ts uses (spec D4's own measured case: Bern in LV95 mistaken for WGS84).
test("initRun refuses a geography file whose coordinates fail the CRS guard, before freezing anything", () => {
  const { dir, csv } = scene();
  const badGeo = join(dir, "lv95.geojson");
  writeFileSync(
    badGeo,
    JSON.stringify({ type: "Point", coordinates: [2600000, 1200000] }),
  );
  const result = initRun(dir, {
    ...declaration(csv),
    input: {
      data: csv,
      geography: {
        path: badGeo,
        encoding: "geojson",
        crs: "EPSG:4326",
        level: "cantons",
        licence: "swisstopo",
        edition: "2024",
        credit: { name: "swisstopo" },
      },
    },
  });
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error("unreachable");
  expect(result.message).toContain("2600000");
  expect(result.message).toContain("re-export");
  expect(existsSync(join(dir, "input"))).toBe(false);
  expect(existsSync(join(dir, "run.json"))).toBe(false);
});

// JSON.parse("null") succeeds — "null" is valid JSON — so the try/catch around the parse alone
// does not stop a degenerate-but-valid-JSON geography file from reaching coordinateRangeVerdict,
// which assumes a Geometry/FeatureCollection object and reads `.type` unconditionally. This is
// the regression test for that: initRun must REFUSE, never throw.
test("initRun refuses a geography file whose content is valid JSON but not a geometry object, instead of throwing", () => {
  const { dir, csv } = scene();
  const nullGeo = join(dir, "null.geojson");
  writeFileSync(nullGeo, "null");
  let result: ReturnType<typeof initRun> | undefined;
  expect(() => {
    result = initRun(dir, {
      ...declaration(csv),
      input: {
        data: csv,
        geography: {
          path: nullGeo,
          encoding: "geojson",
          crs: "EPSG:4326",
          level: "cantons",
          licence: "swisstopo",
          edition: "2024",
          credit: { name: "swisstopo" },
        },
      },
    });
  }).not.toThrow();
  expect(result?.ok).toBe(false);
  if (!result || result.ok) throw new Error("unreachable");
  expect(result.message).toContain("null.geojson");
  expect(existsSync(join(dir, "input"))).toBe(false);
  expect(existsSync(join(dir, "run.json"))).toBe(false);
});

test("initRun freezes an article input too, and declares it", () => {
  const { dir, csv } = scene();
  const article = join(dir, "piece.txt");
  writeFileSync(article, "Les primes ont augmenté dans les six cantons.\n");
  const result = initRun(dir, {
    runId: "both",
    input: { data: csv, article },
    sources: {
      mode: "real",
      data: { kind: "local", label: "Relevés cantonaux 2024" },
      article: { kind: "local", label: "Notre enquête" },
    },
  });
  expect(result.ok).toBe(true);
  const run = readManifest(join(dir, "run.json"), dir);
  expect(run.input.article).toBeDefined();
  expect(existsSync(join(dir, run.input.article!.path))).toBe(true);
});
