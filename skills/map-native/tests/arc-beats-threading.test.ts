import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  unsupportedArcBeatsErrors,
  ARC_CAPABLE_MAP_TYPES,
} from "../src/map-arc";
import { applyMapArc, deriveMapStory, type MapArcBeat } from "../src/map-story";
import {
  resolveRouteWalk,
  routeStoryToChapters,
  scrollyStepCount,
} from "../src/route-story";
import { computeRouteReveal } from "../src/route-geo";
import { computeChoropleth } from "../src/choropleth-geo";
import { deriveLocatorStory } from "../src/locator-story";
import type { LocatorMarker } from "../src/locator-geo";
import { deriveCartogramStory } from "../src/cartogram-story";
import { computeCartogram } from "../src/cartogram-geo";
import { deriveDotDensityStory } from "../src/dot-density-story";
import { computeDotDensity } from "../src/dot-density-geo";
import { deriveHexGridStory } from "../src/hex-grid-story";
import { computeHexGrid } from "../src/hex-grid-geo";
import { mapStoryToChapters } from "../../scrolly/src/chapters";
import world from "../assets/geo/world.geojson" assert { type: "json" };

// The engine's own four story components had the defect a QA sweep found in the scrolly: they
// compose a `meta` for deriveMapStory/deriveSymbolStory and never put `config.arcBeats` in it,
// so a journalist-confirmed walk that PASSED validation was rendered as the salience default —
// on the video track as well as the scrolly one. Guarded at the source, because what went
// wrong is a missing property in an object literal and these components cannot be imported
// under a test (module-scope MapTiler key guard).

const SRC = join(import.meta.dir, "..", "src");

// Words after which a bare `/` starts a regex literal rather than a division operator — mirrors
// lib/geo/static-geojson-imports.test.ts's own regexAllowedBefore.
const REGEX_PRECEDING_WORDS = new Set([
  "return",
  "typeof",
  "instanceof",
  "in",
  "of",
  "new",
  "delete",
  "void",
  "throw",
  "yield",
  "case",
  "do",
  "else",
  "extends",
  "default",
]);

// True if a `/` at this point in the scan opens a regex literal rather than being a division
// operator — see lib/geo/static-geojson-imports.test.ts's own copy for the full reasoning.
function regexAllowedBefore(out: string): boolean {
  let j = out.length - 1;
  while (j >= 0 && /\s/.test(out[j]!)) j--;
  if (j < 0) return true;
  const c = out[j]!;
  if (/[A-Za-z0-9_$)\]]/.test(c)) {
    let k = j;
    while (k >= 0 && /[A-Za-z0-9_$]/.test(out[k]!)) k--;
    const word = out.slice(k + 1, j + 1);
    return REGEX_PRECEDING_WORDS.has(word);
  }
  return true;
}

// Strips `//` line comments and `/* … */` block comments, replacing comment characters with
// spaces so line/column offsets are preserved — mirrors lib/geo/static-geojson-imports.test.ts's
// own stripComments (same discipline: a naive scan over raw source matches the file's own prose
// as readily as the code it describes, and a doc comment naming a function by hand is exactly
// how a source-scan guard ends up brittle to a harmless wording edit). String literals
// (single/double/backtick) are tracked as opaque so a `//` inside one is never mistaken for a
// comment start — and so are regex literals, for the same reason: a character class like
// `/[/*]/` contains a bare `/` immediately followed by `*` that, read naively, opens what looks
// like an unterminated block comment and silently swallows the rest of the file (see
// lib/geo/static-geojson-imports.test.ts's header comment for the full account of this bug).
function stripLineAndBlockComments(src: string): string {
  let out = "";
  let state:
    | "code"
    | "line-comment"
    | "block-comment"
    | "string-single"
    | "string-double"
    | "template"
    | "regex" = "code";
  let inCharClass = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    const next = src[i + 1];
    if (state === "code") {
      if (c === "/" && next === "/") {
        state = "line-comment";
        out += "  ";
        i++;
      } else if (c === "/" && next === "*") {
        state = "block-comment";
        out += "  ";
        i++;
      } else if (c === "'" || c === '"' || c === "`") {
        state =
          c === "'"
            ? "string-single"
            : c === '"'
              ? "string-double"
              : "template";
        out += c;
      } else if (c === "/" && next !== undefined && regexAllowedBefore(out)) {
        state = "regex";
        inCharClass = false;
        out += c;
      } else {
        out += c;
      }
      continue;
    }
    if (state === "line-comment") {
      if (c === "\n") {
        state = "code";
        out += c;
      } else {
        out += " ";
      }
      continue;
    }
    if (state === "block-comment") {
      if (c === "*" && next === "/") {
        state = "code";
        out += "  ";
        i++;
      } else {
        out += c === "\n" ? "\n" : " ";
      }
      continue;
    }
    if (state === "regex") {
      if (c === "\\" && next !== undefined) {
        out += c + next;
        i++;
      } else if (c === "[") {
        inCharClass = true;
        out += c;
      } else if (c === "]") {
        inCharClass = false;
        out += c;
      } else if (c === "/" && !inCharClass) {
        state = "code";
        out += c;
      } else {
        out += c;
      }
      continue;
    }
    const quote =
      state === "string-single" ? "'" : state === "string-double" ? '"' : "`";
    if (c === "\\" && next !== undefined) {
      out += c + next;
      i++;
    } else if (c === quote) {
      state = "code";
      out += c;
    } else {
      out += c;
    }
  }
  return out;
}

describe("map-native story components forward the confirmed claim-arc", () => {
  const files = [
    "components/ChoroplethStory.tsx", // video
    "components/SymbolStory.tsx", // video
    "components/LocatorStory.tsx", // video
    "components/CartogramStory.tsx", // video
    "components/DotDensityStory.tsx", // video
    "components/HexGridStory.tsx", // video
    "components/ChoroplethScrolly.tsx", // scrolly
    "components/SymbolScrolly.tsx", // scrolly
    "components/LocatorScrolly.tsx", // scrolly
    "components/CartogramScrolly.tsx", // scrolly
    "components/DotDensityScrolly.tsx", // scrolly
    "components/HexGridScrolly.tsx", // scrolly
    // Deliberately NOT here: components/RouteScrolly.tsx and components/RouteReveal.tsx.
    // RouteScrolly.tsx does not thread arcBeats through a `meta` object literal at all — see
    // the dedicated route block below for why, and for the (stronger) invariant it checks
    // instead. RouteReveal.tsx (route's video) draws the route's own line on as a single
    // continuous physical sweep through every crossed territory in geographic order — there is
    // no discrete-beat seam for a confirmed arc to reorder or subset (see its own header
    // comment on this). Also NOT here: components/HexGridReveal.tsx — same shape as
    // RouteReveal.tsx (fixed-camera fade-in over the whole grid, no discrete beats at all).
  ];
  for (const file of files) {
    it(`${file} puts arcBeats in the deriver meta`, () => {
      const source = readFileSync(join(SRC, file), "utf8");
      expect(source).toMatch(/arcBeats:\s*config\.arcBeats/);
    });
  }
});

// route is structurally different from every other arc-capable type, and had TWO rounds of
// silent-regression bugs to prove it:
//
//   Round 1: a component built its walk order INLINE, separately from routeStoryToChapters's
//   own internal resolveRouteArc call — the caption followed a confirmed arc while the
//   camera/highlight kept following the geographic walk.
//
//   Round 2: after extracting resolveRouteWalk so both sides delegated to ONE function, the
//   component still held TWO independent CALLS to it in the same render — one direct (for
//   camera/emphasis), one indirect through routeStoryToChapters's OLD signature (which took
//   `arcBeats` and called resolveRouteWalk itself, for captions). A mutation that broke only
//   the direct call left EVERY grepped literal — including a regex on the direct call's own
//   text — textually intact, because the indirect call (a DIFFERENT line, inside
//   routeStoryToChapters, in a different file) still matched.
//
// The structural fix (route-story.ts): routeStoryToChapters now takes the ALREADY-RESOLVED
// walk as a parameter, not `arcBeats` — it cannot call resolveRouteWalk itself anymore, by
// construction, so the round-2 exploit (an indirect SECOND call inside routeStoryToChapters)
// is not merely untested, it is not expressible: there is no `arcBeats` for it to receive.
//
// What remains representable, and what this test guards: RouteScrolly.tsx could still
// reintroduce a SECOND, independent resolveRouteWalk(...) call of its OWN — e.g. computing the
// walk once for the caption and AGAIN (wrongly) for the returned camera/emphasis data. Rather
// than grep for one specific line surviving (round 2's exact failure mode — a mutation
// elsewhere left that check's target line untouched), this counts EVERY occurrence of
// `resolveRouteWalk(` in the component's source: it must be exactly one, no matter WHERE a
// second one might be introduced. See claim-arc-map.test.ts's "resolveRouteWalk — the walk
// routeStoryToChapters and RouteScrolly.tsx both resolve from" block for the deeper behavioural
// proof that the shared function itself is correct; this is the narrower, component-source
// invariant that there is only ever one place it gets called from.
describe("RouteScrolly.tsx resolves its walk exactly once, and threads that value everywhere", () => {
  const routeScrollySource = readFileSync(
    join(SRC, "components/RouteScrolly.tsx"),
    "utf8",
  );

  it("calls resolveRouteWalk(l, config.arcBeats) — not a re-derived/hardcoded walk", () => {
    expect(routeScrollySource).toMatch(
      /resolveRouteWalk\(\s*l,\s*config\.arcBeats\s*\)/,
    );
  });

  // Counting the CALL form (`resolveRouteWalk(`) alone is defeated by a one-line alias:
  // `const rw2 = resolveRouteWalk;` then calling `rw2(l, undefined)` elsewhere adds a second,
  // independent derivation of the walk — the exact round-2 shape this test exists to catch —
  // while every occurrence of the literal text `resolveRouteWalk(` in the file stays unchanged
  // (measured: the call-form count stays 1 under that exploit). Counting the BARE identifier
  // instead catches it (measured: 2 → 3 under the exploit), because the alias assignment itself
  // — `= resolveRouteWalk` — is a second occurrence of the identifier, call or not.
  //
  // Comments are stripped before counting so a doc-comment mention of "resolveRouteWalk" (this
  // file's own header explains the round-1/round-2 history by name, three times) cannot change
  // the count — a harmless prose edit must never flip this test. What remains after stripping is
  // exactly TWO code occurrences today: the import (`import { ..., resolveRouteWalk, ... }`) and
  // the one real call. A third occurrence, anywhere — an alias, a re-export, a second import
  // binding — is the regression.
  it("the bare identifier `resolveRouteWalk` appears exactly twice in CODE (the import + the one real call) — a third occurrence anywhere is the round-2 bug reintroduced, alias or not", () => {
    const stripped = stripLineAndBlockComments(routeScrollySource);
    const occurrences = stripped.match(/\bresolveRouteWalk\b/g) ?? [];
    expect(occurrences).toHaveLength(2);
  });

  it("passes the resolved walk (not `arcBeats`) into routeStoryToChapters — the type signature routeStoryToChapters(layout, walk, meta) makes a re-derivation from arcBeats inside it impossible, this confirms the CALLER honours that", () => {
    expect(routeScrollySource).toMatch(/routeStoryToChapters\(\s*l,\s*w,/);
    // And `meta` no longer carries `arcBeats` at all — the field doesn't exist on
    // routeStoryToChapters's parameter type anymore, so this would be a type error if
    // reintroduced; the source check is a cheap, redundant backstop.
    expect(routeScrollySource).not.toMatch(/arcBeats:\s*config\.arcBeats/);
  });
});

// ---------------------------------------------------------------------------
// The SIZERS mirror the derivation, and had to be threaded with it.
//
// scrollyStepCount (route-story.ts) and Root.tsx's storyMeta/symbolStoryMeta are
// calculateMetadata functions: they re-derive the walk purely to compute a composition's
// duration, and their comments say they exist so "the counts match exactly". Threading the arc
// into the RENDERER alone broke that agreement in the worst direction — the components built
// their phases from the six confirmed beats while the duration was still sized from the
// salience walk, so the mp4 was sized for 7 steps and cut before the journalist's `turn` and
// `payoff`. An arc SHORTER than the salience walk gives the frozen tail instead. Both are
// worse than either side being wrong alone, which is the whole reason the mirror exists.
// ---------------------------------------------------------------------------

describe("the composition sizers agree with the walk that renders", () => {
  // The render proof's fixture: 8 rows of data, a 6-region confirmed arc that is NOT the
  // salience order and NOT the salience LENGTH (salience caps at 3 leaders + tail).
  const ROWS = [
    { code: "NOR", share: 99 },
    { code: "SWE", share: 68 },
    { code: "DEU", share: 59 },
    { code: "GBR", share: 48 },
    { code: "ESP", share: 44 },
    { code: "ITA", share: 41 },
    { code: "FRA", share: 27 },
    { code: "POL", share: 21 },
  ];
  const ARC = [
    { region: "NOR", role: "establish" as const, text: "un" },
    { region: "SWE", role: "build" as const, text: "deux" },
    { region: "POL", role: "build" as const, text: "trois" },
    { region: "DEU", role: "build" as const, text: "quatre" },
    { region: "FRA", role: "turn" as const, text: "cinq" },
    { region: "ITA", role: "payoff" as const, text: "six" },
  ];
  const base = {
    title: "Le renouvelable, du nord au sud",
    description: "Part du renouvelable, 2024",
    valueUnit: "%",
    basemap: "world",
    regionKey: "code",
    valueField: "share",
    lang: "fr",
    rows: ROWS,
  };

  // What the RENDERER walks — the components' own derivation, reproduced here.
  function renderedSteps(config: Record<string, unknown>): number {
    const layout = computeChoropleth(
      config as never,
      world as unknown as GeoJSON.FeatureCollection,
      "iso_a3",
      { bins: 5, scaleType: "sequential" },
    );
    const beats = deriveMapStory(
      layout,
      world as unknown as GeoJSON.FeatureCollection,
      "iso_a3",
      {
        title: base.title,
        insight: base.title,
        unit: base.valueUnit,
        lang: base.lang,
        arcBeats: config.arcBeats as never,
      },
    );
    return mapStoryToChapters(beats, {
      title: base.title,
      description: base.description,
      regionsWithData: layout.joined.filter((j) => j.value !== null).length,
    }).steps.length;
  }

  const size = (config: Record<string, unknown>) =>
    scrollyStepCount(config, world as unknown as GeoJSON.FeatureCollection);

  it("sizes an ARC config for the arc's own length, not the salience walk's", () => {
    const config = { ...base, arcBeats: ARC };
    // title + establish + 6 confirmed reveals + takeaway, minus the beats mapStoryToChapters
    // drops — whatever that number is, both sides must say it.
    expect(size(config)).toBe(renderedSteps(config));
  });

  it("can go red: the arc's length differs from the salience walk's", () => {
    // Without this the assertion above would pass on a fixture where the two happen to agree,
    // which is exactly the state the branch shipped in before the review caught it.
    const withArc = { ...base, arcBeats: ARC };
    const withoutArc = { ...base };
    expect(size(withArc)).not.toBe(size(withoutArc));
    expect(renderedSteps(withArc)).not.toBe(renderedSteps(withoutArc));
  });

  it("leaves the salience sizing untouched", () => {
    const config = { ...base };
    expect(size(config)).toBe(renderedSteps(config));
  });
});

// Same class of proof for locator, added when the locator deriver gained arc support
// (map-storyboard-and-video-geography, Task 1). LocatorStory.tsx/LocatorScrolly.tsx both
// literally call deriveLocatorStory(config.markers, meta) then mapStoryToChapters(beats, ...)
// (see LocatorScrolly.tsx's per-beat camera-solution build) — reproduced here as
// `renderedSteps`, exactly like the choropleth block above.
describe("the locator sizer agrees with the walk that renders", () => {
  const MARKERS: LocatorMarker[] = [
    { lon: 6.1, lat: 46.2, label: "Geneva" },
    { lon: 6.6, lat: 46.5, label: "Lausanne" },
    { lon: 8.5, lat: 47.4, label: "Zurich" },
    { lon: 7.4, lat: 46.9, label: "Bern" },
    { lon: 4.8, lat: 45.7, label: "Chambéry" },
  ];
  const ARC: MapArcBeat[] = [
    { region: "Zurich", role: "establish", text: "Zurich anchors it." },
    { region: "Bern", role: "build", text: "Bern widens it." },
    { region: "Geneva", role: "payoff", text: "Geneva closes it." },
  ];
  const base = {
    type: "locator" as const,
    title: "Five places, in the order the story needs",
    description: "Five Swiss/French places",
    basemap: "world",
    markers: MARKERS,
  };

  function renderedSteps(config: Record<string, unknown>): number {
    const beats = deriveLocatorStory(config.markers as LocatorMarker[], {
      title: config.title as string,
      description: config.description as string | undefined,
      insight:
        (config.insight as string | undefined) ?? (config.title as string),
      arcBeats: config.arcBeats as MapArcBeat[] | undefined,
    });
    return mapStoryToChapters(beats, {
      title: config.title as string,
      description: config.description as string | undefined,
      regionsWithData: (config.markers as unknown[]).length,
    }).steps.length;
  }

  const size = (config: Record<string, unknown>) =>
    scrollyStepCount(config, world as unknown as GeoJSON.FeatureCollection);

  it("sizes an ARC config for the arc's own length, not the salience walk's", () => {
    const config = { ...base, arcBeats: ARC };
    expect(size(config)).toBe(renderedSteps(config));
  });

  it("can go red: the arc's length differs from the salience walk's", () => {
    // 3 confirmed reveals vs. 5 salience reveals (all 5 markers, few-annotated, default cap) —
    // the two walks CANNOT accidentally agree here, so this is a real lever.
    const withArc = { ...base, arcBeats: ARC };
    const withoutArc = { ...base };
    expect(size(withArc)).not.toBe(size(withoutArc));
    expect(renderedSteps(withArc)).not.toBe(renderedSteps(withoutArc));
  });

  it("leaves the salience sizing untouched", () => {
    const config = { ...base };
    expect(size(config)).toBe(renderedSteps(config));
  });
});

// Same class of proof for cartogram, added when the cartogram deriver gained arc support
// (map-storyboard-and-video-geography, Task 2). CartogramStory.tsx/CartogramScrolly.tsx both
// literally call deriveCartogramStory(layout, meta) then mapStoryToChapters(beats, ...) —
// reproduced here as `renderedSteps`, exactly like the choropleth/locator blocks above.
describe("the cartogram sizer agrees with the walk that renders", () => {
  // Real ISO codes (world.geojson's iso_a3 join, cartogram's default joinKey) — same
  // countries the choropleth sizer block above already exercises.
  const VALUES = [
    { id: "NOR", value: 99 },
    { id: "SWE", value: 68 },
    { id: "DEU", value: 59 },
    { id: "GBR", value: 48 },
    { id: "ESP", value: 44 },
    { id: "ITA", value: 41 },
    { id: "FRA", value: 27 },
    { id: "POL", value: 21 },
  ];
  const ARC: MapArcBeat[] = [
    { region: "DEU", role: "establish", text: "Germany anchors it." },
    { region: "POL", role: "build", text: "Poland widens it." },
    { region: "NOR", role: "payoff", text: "Norway closes it." },
  ];
  const base = {
    type: "cartogram" as const,
    title: "Eight regions, in the order the story needs",
    description: "Eight European cartogram cells",
    basemap: "world",
    values: VALUES,
  };

  function renderedSteps(config: Record<string, unknown>): number {
    const layout = computeCartogram(
      config as never,
      world as unknown as GeoJSON.FeatureCollection,
    );
    const beats = deriveCartogramStory(layout, {
      title: config.title as string,
      description: config.description as string | undefined,
      insight:
        (config.insight as string | undefined) ?? (config.title as string),
      arcBeats: config.arcBeats as MapArcBeat[] | undefined,
    });
    return mapStoryToChapters(beats, {
      title: config.title as string,
      description: config.description as string | undefined,
      regionsWithData: layout.cells.length,
    }).steps.length;
  }

  const size = (config: Record<string, unknown>) =>
    scrollyStepCount(config, world as unknown as GeoJSON.FeatureCollection);

  it("sizes an ARC config for the arc's own length, not the value-ranked walk's", () => {
    const config = { ...base, arcBeats: ARC };
    expect(size(config)).toBe(renderedSteps(config));
  });

  it("can go red: the arc's length differs from the value-ranked walk's", () => {
    // 3 confirmed reveals vs. 5 value-ranked reveals (all 8 regions, default cap) — the two
    // walks CANNOT accidentally agree here, so this is a real lever.
    const withArc = { ...base, arcBeats: ARC };
    const withoutArc = { ...base };
    expect(size(withArc)).not.toBe(size(withoutArc));
    expect(renderedSteps(withArc)).not.toBe(renderedSteps(withoutArc));
  });

  it("leaves the value-ranked sizing untouched", () => {
    const config = { ...base };
    expect(size(config)).toBe(renderedSteps(config));
  });
});

// Same class of proof for dot-density, added when the dot-density deriver gained arc support
// (map-storyboard-and-video-geography, Task 3). DotDensityStory.tsx/DotDensityScrolly.tsx both
// literally call deriveDotDensityStory(layout, meta) then mapStoryToChapters(beats, ...) —
// reproduced here as `renderedSteps`, exactly like the cartogram block above. Anchored on
// `regionKey` values in the rows, the same shape choropleth uses.
describe("the dot-density sizer agrees with the walk that renders", () => {
  // Real ISO codes (world.geojson's iso_a3 join, dot-density's default joinKey) — same
  // countries the choropleth/cartogram sizer blocks above already exercise.
  const ROWS = [
    { iso_a3: "NOR", value: 99 },
    { iso_a3: "SWE", value: 68 },
    { iso_a3: "DEU", value: 59 },
    { iso_a3: "GBR", value: 48 },
    { iso_a3: "ESP", value: 44 },
    { iso_a3: "ITA", value: 41 },
    { iso_a3: "FRA", value: 27 },
    { iso_a3: "POL", value: 21 },
  ];
  const ARC: MapArcBeat[] = [
    { region: "DEU", role: "establish", text: "Germany anchors it." },
    { region: "POL", role: "build", text: "Poland widens it." },
    { region: "NOR", role: "payoff", text: "Norway closes it." },
  ];
  const base = {
    type: "dot-density" as const,
    title: "Eight regions, in the order the story needs",
    description: "Eight European dot-density regions",
    basemap: "world",
    boundaries: "world",
    regionKey: "iso_a3",
    valueField: "value",
    rows: ROWS,
  };

  function renderedSteps(config: Record<string, unknown>): number {
    const layout = computeDotDensity(
      config as never,
      world as unknown as GeoJSON.FeatureCollection,
      "iso_a3",
    );
    const beats = deriveDotDensityStory(layout, {
      title: config.title as string,
      description: config.description as string | undefined,
      insight:
        (config.insight as string | undefined) ?? (config.title as string),
      unit: (config.valueUnit as string | undefined) ?? "",
      arcBeats: config.arcBeats as MapArcBeat[] | undefined,
    });
    return mapStoryToChapters(beats, {
      title: config.title as string,
      description: config.description as string | undefined,
      regionsWithData: layout.regions.length,
    }).steps.length;
  }

  const size = (config: Record<string, unknown>) =>
    scrollyStepCount(config, world as unknown as GeoJSON.FeatureCollection);

  it("sizes an ARC config for the arc's own length, not the density-ranked walk's", () => {
    const config = { ...base, arcBeats: ARC };
    expect(size(config)).toBe(renderedSteps(config));
  });

  it("can go red: the arc's length differs from the density-ranked walk's", () => {
    // 3 confirmed reveals vs. 5 density-ranked reveals (all 8 regions, default cap) — the two
    // walks CANNOT accidentally agree here, so this is a real lever.
    const withArc = { ...base, arcBeats: ARC };
    const withoutArc = { ...base };
    expect(size(withArc)).not.toBe(size(withoutArc));
    expect(renderedSteps(withArc)).not.toBe(renderedSteps(withoutArc));
  });

  it("leaves the density-ranked sizing untouched", () => {
    const config = { ...base };
    expect(size(config)).toBe(renderedSteps(config));
  });
});

// Same class of proof for hex-grid, added when the hex-grid deriver gained arc support
// (map-storyboard-and-video-geography, Task 5 — the last type). HexGridStory.tsx/
// HexGridScrolly.tsx both literally call deriveHexGridStory(layout, meta) then
// mapStoryToChapters(beats, ...) — reproduced here as `renderedSteps`, exactly like the
// dot-density block above. Unlike every other block here, hex-grid's arc is anchored on a
// PLACE (lon/lat), not a data key — two clusters far enough apart (2°E vs 20°E) that a 30km
// square grid drops every cell between them, mirroring claim-arc-map.test.ts's own fixture.
describe("the hex-grid sizer agrees with the walk that renders", () => {
  const POINTS = [
    { lon: 2.0, lat: 46.0 },
    { lon: 2.05, lat: 46.02 },
    { lon: 1.95, lat: 45.98 },
    { lon: 2.02, lat: 45.97 },
    { lon: 20.0, lat: 46.0 },
    { lon: 20.05, lat: 46.02 },
    { lon: 19.95, lat: 45.98 },
    { lon: 20.02, lat: 45.97 },
  ];
  const ARC: MapArcBeat[] = [
    {
      region: "The eastern cluster",
      role: "establish",
      text: "It starts in the east.",
      lon: 20.0,
      lat: 46.0,
    },
    {
      region: "The western cluster",
      role: "payoff",
      text: "It closes in the west.",
      lon: 2.0,
      lat: 46.0,
    },
  ];
  const base = {
    type: "hex-grid" as const,
    title: "Two clusters, in the order the story needs",
    description: "Two hex-grid clusters",
    basemap: "world",
    points: POINTS,
    binShape: "square" as const,
    cellSizeKm: 30,
  };

  function renderedSteps(config: Record<string, unknown>): number {
    const layout = computeHexGrid(config as never);
    const beats = deriveHexGridStory(layout, {
      title: config.title as string,
      description: config.description as string | undefined,
      insight:
        (config.insight as string | undefined) ?? (config.title as string),
      arcBeats: config.arcBeats as MapArcBeat[] | undefined,
    });
    return mapStoryToChapters(beats, {
      title: config.title as string,
      description: config.description as string | undefined,
      regionsWithData: layout.cells.length,
    }).steps.length;
  }

  const size = (config: Record<string, unknown>) =>
    scrollyStepCount(config, world as unknown as GeoJSON.FeatureCollection);

  it("sizes an ARC config for the arc's own length, not the value-ranked walk's", () => {
    const config = { ...base, arcBeats: ARC };
    expect(size(config)).toBe(renderedSteps(config));
  });

  it("can go red: the arc's length differs from the value-ranked walk's", () => {
    // 2 confirmed reveals vs. 4 value-ranked reveals (all 4 populated cells, default cap) —
    // the two walks CANNOT accidentally agree here, so this is a real lever.
    const withArc = { ...base, arcBeats: ARC };
    const withoutArc = { ...base };
    expect(size(withArc)).not.toBe(size(withoutArc));
    expect(renderedSteps(withArc)).not.toBe(renderedSteps(withoutArc));
  });

  it("leaves the value-ranked sizing untouched", () => {
    const config = { ...base };
    expect(size(config)).toBe(renderedSteps(config));
  });
});

// Same class of proof for route, added when the route deriver gained arc support
// (map-storyboard-and-video-geography, Task 4). Unlike the four blocks above, route's
// deriver is routeStoryToChapters (not deriveXStory + mapStoryToChapters) — reproduced
// here as `renderedSteps`, calling it exactly as RouteScrolly.tsx's own layout/story build
// does. The route this fixture walks (Beijing → Tibet → Delhi, world.geojson) crosses
// CHN, NPL, IND in that geographic order (verified against computeRouteReveal directly);
// the arc below names only IND and CHN — a length that provably differs from the
// geographic walk's 3.
describe("the route sizer agrees with the walk that renders", () => {
  const ROUTE = {
    type: "route" as const,
    route: [
      [116.4, 39.9],
      [96.0, 33.0],
      [88.0, 29.0],
      [77.2, 28.6],
    ] as [number, number][],
    basemap: "dataviz",
    title: "A river's path from Tibet to the sea",
    description: "The route crosses several territories.",
  };
  const ARC: MapArcBeat[] = [
    { region: "IND", role: "establish", text: "India opens it." },
    { region: "CHN", role: "payoff", text: "China closes it." },
  ];
  const base = { ...ROUTE };

  function renderedSteps(config: Record<string, unknown>): number {
    const layout = computeRouteReveal(
      config as never,
      world as unknown as GeoJSON.FeatureCollection,
    );
    // Mirrors RouteScrolly.tsx's own call pattern exactly: resolve the walk ONCE, then pass
    // it (not `arcBeats`) into routeStoryToChapters — routeStoryToChapters can no longer
    // resolve arcBeats itself, by construction (see route-story.ts's header comment).
    const walk = resolveRouteWalk(
      layout,
      config.arcBeats as MapArcBeat[] | undefined,
    );
    return routeStoryToChapters(layout, walk, {
      title: config.title as string,
      description: config.description as string | undefined,
    }).steps.length;
  }

  const size = (config: Record<string, unknown>) =>
    scrollyStepCount(config, world as unknown as GeoJSON.FeatureCollection);

  it("sizes an ARC config for the arc's own length, not the geographic-order walk's", () => {
    const config = { ...base, arcBeats: ARC };
    expect(size(config)).toBe(renderedSteps(config));
  });

  it("can go red: the arc's length differs from the geographic-order walk's", () => {
    // 2 confirmed reveals (IND, CHN) vs. 3 geographic-order reveals (CHN, NPL, IND) — the
    // two walks CANNOT accidentally agree here, so this is a real lever.
    const withArc = { ...base, arcBeats: ARC };
    const withoutArc = { ...base };
    expect(size(withArc)).not.toBe(size(withoutArc));
    expect(renderedSteps(withArc)).not.toBe(renderedSteps(withoutArc));
  });

  it("leaves the geographic-order sizing untouched", () => {
    const config = { ...base };
    expect(size(config)).toBe(renderedSteps(config));
  });
});

describe("Remotion's calculateMetadata sizers forward the arc too", () => {
  // Root.tsx cannot be imported under a test (remotion + module-scope MapTiler key), and what
  // went wrong is a missing property in an object literal — same guard shape as above.
  it("storyMeta, symbolStoryMeta, locatorStoryMeta, cartogramStoryMeta, dotDensityStoryMeta and hexGridStoryMeta all put arcBeats in the deriver meta", () => {
    const source = readFileSync(
      join(import.meta.dir, "..", "remotion", "src", "Root.tsx"),
      "utf8",
    );
    expect(source.match(/arcBeats:\s*cfg\.arcBeats/g) ?? []).toHaveLength(6);
  });
});

// scrollyMeta (the SEVENTH calculateMetadata sizer, for the "MapScrolly"/"MapScrollySquare"/
// "MapScrollyPortrait" compositions) was the one Task 10 missed: it kept passing the bundled
// `world` import unconditionally into scrollyStepCount, which hardcoded "iso_a3" for the
// geometry-joining types — the identical defect Task 10 fixed for storyMeta/dotDensityStoryMeta/
// cartogramStoryMeta. Source-scanned here for the same reason as the block above (Root.tsx
// cannot be imported under a test); the actual joinKey-threading logic is proven behaviourally
// below, on the pure `scrollyStepCount` function itself.
describe("scrollyMeta resolves the REAL injected geometry, not the bundled world.geojson", () => {
  const source = readFileSync(
    join(import.meta.dir, "..", "remotion", "src", "Root.tsx"),
    "utf8",
  );

  it("calls resolveVideoGeometry, mirroring storyMeta/dotDensityStoryMeta/cartogramStoryMeta", () => {
    expect(source).toMatch(
      /resolveVideoGeometry\(\s*cfg,\s*"scrollyMeta"\s*\)/,
    );
  });

  it("skips resolveVideoGeometry for the geometry-free types (symbol/locator/hex-grid) — it would throw on their sample/default-props configs, none of which carry config.geometry", () => {
    expect(source).toMatch(
      /!\[\s*"symbol",\s*"locator",\s*"hex-grid"\s*\]\.includes\(cfg\?\.type\)/,
    );
  });

  it("passes the resolved joinKey into scrollyStepCount, not just the resolved world", () => {
    expect(source).toMatch(
      /scrollyStepCount\(\s*cfg,\s*resolvedWorld,\s*joinKey\s*\)/,
    );
  });
});

// Behavioural proof, on the pure function itself, that scrollyStepCount's new `joinKey`
// argument is actually threaded to the region match — not decorative. A basemap whose features
// are keyed on "code" (not "iso_a3", the default) sizes correctly with the right key and THROWS
// with the old hardcoded one — the exact "throws inside calculateMetadata" failure a non-world
// config hit before this fix.
describe("scrollyStepCount's joinKey argument actually drives the region match", () => {
  const customWorld: GeoJSON.FeatureCollection = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { code: "AAA" },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [1, 0],
              [1, 1],
              [0, 1],
              [0, 0],
            ],
          ],
        },
      },
      {
        type: "Feature",
        properties: { code: "BBB" },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [2, 0],
              [3, 0],
              [3, 1],
              [2, 1],
              [2, 0],
            ],
          ],
        },
      },
    ],
  };
  const config = {
    regionKey: "code",
    valueField: "value",
    title: "Two regions, a custom join key",
    rows: [
      { code: "AAA", value: 1 },
      { code: "BBB", value: 2 },
    ],
  };

  it("sizes correctly with the matching joinKey", () => {
    expect(scrollyStepCount(config, customWorld, "code")).toBeGreaterThan(0);
  });

  it('defaults to "iso_a3" for backward compatibility (existing callers keep working unchanged)', () => {
    // customWorld carries no "iso_a3" property at all — same failure mode as the explicit
    // wrong-key case below, proving the DEFAULT really is "iso_a3", not silently something else.
    expect(() => scrollyStepCount(config, customWorld)).toThrow(
      /no region matched the data/,
    );
  });

  it('throws with the old hardcoded "iso_a3" — the exact failure a non-world config hit before this fix', () => {
    expect(() => scrollyStepCount(config, customWorld, "iso_a3")).toThrow(
      /no region matched the data/,
    );
  });
});

describe("applyMapArc marks its beats as authored", () => {
  it("stamps every arc reveal, so a caption composer can tell it from a derived one", () => {
    const beats = applyMapArc(
      [
        { region: "A", role: "establish", text: "one" },
        { region: "B", role: "payoff", text: "two" },
      ],
      (region) => ({
        camera: [0, 0, 1, 1],
        highlight: [region],
        name: region,
        value: "1",
      }),
    );
    expect(beats.map((b) => b.authored)).toEqual([true, true]);
    // The claim is the copy — never a derived "name — value".
    expect(beats.map((b) => b.copy)).toEqual(["one", "two"]);
  });
});

// hex-grid (Task 5) was the last non-capable real map type — ARC_CAPABLE_MAP_TYPES now equals
// every real map type there is, so no REAL type string can reach the refusal branch anymore.
// map-arc.ts's own DECISION comment on unsupportedArcBeatsErrors explains why it is kept
// anyway (defence-in-depth against a capability regression AND a genuinely new, 8th map
// type), and states the consequence for testing it: it can no longer be exercised with a real
// map-type string, so the fixture below is a string that is DELIBERATELY not a map type at
// all — proving the function guards the BOUNDARY (capable-list membership), not a specific
// list of "the types that still can't". A green test asserting a refusal that can never fire
// for a real type would be exactly the defect this plan kept paying for (see Task 2/Task 4's
// own fixture moves, and the plan's AMENDMENT) — this is deliberately NOT a real type, so it
// never expires.
describe("unsupportedArcBeatsErrors", () => {
  const plan = [{ region: "A", role: "establish" as const, text: "a" }];
  const NOT_A_MAP_TYPE = "not-a-real-map-type";

  it("is silent for every arc-capable type", () => {
    for (const type of ARC_CAPABLE_MAP_TYPES)
      expect(unsupportedArcBeatsErrors({ arcBeats: plan }, type)).toEqual([]);
  });

  it("is silent when no plan was submitted", () => {
    expect(unsupportedArcBeatsErrors({}, NOT_A_MAP_TYPE)).toEqual([]);
  });

  it("refuses by name, and names the way out", () => {
    const errors = unsupportedArcBeatsErrors(
      { arcBeats: plan },
      NOT_A_MAP_TYPE,
    );
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("arcBeats");
    expect(errors[0]).toContain(NOT_A_MAP_TYPE);
    // The refusal has to say which types DO walk an arc — otherwise it is a dead end. Every
    // REAL map type, now — the full list.
    for (const type of ARC_CAPABLE_MAP_TYPES) expect(errors[0]).toContain(type);
  });

  it("refuses an EMPTY plan too — an empty array is still a field the render ignores", () => {
    expect(
      unsupportedArcBeatsErrors({ arcBeats: [] }, NOT_A_MAP_TYPE),
    ).toHaveLength(1);
  });
});

describe("stripLineAndBlockComments does not desynchronise on a regex literal (source-scan helper)", () => {
  it("a character class regex `/[/*]/` does not open a phantom, unterminated block comment", () => {
    // Read naively in "code" state, the `/` immediately before the `*` inside `[/*]` looks
    // exactly like the start of a `/* … */` block comment, which — absent a real `*/` later in
    // the file — silently swallows everything after it, including the second
    // `resolveRouteWalk` occurrence the describe block above counts on.
    const fixture = [
      "const RE = /[/*]/;",
      "resolveRouteWalk(l, config.arcBeats);",
    ].join("\n");
    const stripped = stripLineAndBlockComments(fixture);
    expect((stripped.match(/\bresolveRouteWalk\b/g) ?? []).length).toBe(1);
    expect(stripped.split("\n")[0]).toBe("const RE = /[/*]/;");
  });

  it("a `/` after an identifier is still read as division, not a regex (no false opposite)", () => {
    const fixture = "const half = total / /* two */ 2;";
    const stripped = stripLineAndBlockComments(fixture);
    expect(stripped).not.toContain("two");
    expect(stripped).toContain("const half = total /");
  });
});
