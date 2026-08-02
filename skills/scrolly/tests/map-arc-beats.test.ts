import { describe, it, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { mapStoryToChapters } from "../src/chapters";
import { applyMapArc, type Beat } from "../../map-native/src/map-story";
import { mapNativeConfigErrors } from "../../map-native/src/validate-config";

// THE DEFECT this file pins, in the three shapes a QA sweep found it in:
//
//   1. the scrolly's map track never forwarded a journalist-confirmed `arcBeats` plan to the
//      deriver — neither the caption derivation (Scrolly.tsx) nor the camera computation
//      (ScrollyMap.tsx / ScrollySymbolMap.tsx) — so a validated arc collapsed to the
//      salience-sorted default and the reader saw the wrong region under each caption;
//   2. even when the arc IS honoured, mapStoryToChapters REWROTE every reveal caption as
//      "<name> — <value>, <descriptor>", where the descriptor is read off the beat's POSITION
//      in the reveal list. Under an arc that position is geography, not rank — which is how a
//      region that is merely LAST in the walk got labelled "the lowest" when another region
//      held the minimum. The journalist's own claim (`copy`) was dropped on the floor;
//   3. the five map types whose derivers have no arc support at all accepted `arcBeats`
//      through validation and then silently ignored it.
//
// Silence is the one unacceptable outcome: honour the plan, or refuse it by name.

const ARC_ORDER = ["ITA-N", "ITA-C", "ITA-S"];
const CLAIMS = [
  "Le Nord concentre les trois quarts des lits de soins intensifs.",
  "Au centre, la couverture se tient encore, de justesse.",
  "En Calabre, il ne reste plus rien à réduire.",
];

// The anchors a deriver's `resolve` returns — deliberately shaped so the walk's LAST region is
// NOT the minimum. That is the Lazio/Calabria mislabel in miniature: with the arc honoured,
// caption 3 sits on the true minimum, and caption 2 must not be called "the lowest" for being
// second-to-last.
const ANCHORS: Record<string, { value: string; name: string }> = {
  "ITA-N": { name: "Lombardie", value: "12,4" },
  "ITA-C": { name: "Latium", value: "8,1" },
  "ITA-S": { name: "Calabre", value: "3,2" },
};

function arcRevealBeats(): Beat[] {
  return applyMapArc(
    ARC_ORDER.map((region, i) => ({
      region,
      role: (i === 0 ? "establish" : i === 1 ? "build" : "payoff") as
        "establish" | "build" | "payoff",
      text: CLAIMS[i],
    })),
    (region) => {
      const a = ANCHORS[region];
      return a
        ? {
            camera: [8, 38, 14, 46] as [number, number, number, number],
            highlight: [region],
            name: a.name,
            value: a.value,
          }
        : null;
    },
  );
}

function framed(reveals: Beat[]): Beat[] {
  const bounds: [number, number, number, number] = [6, 36, 19, 47];
  return [
    {
      kind: "title",
      camera: bounds,
      highlight: [],
      dim: false,
      callout: null,
      copy: "Soins intensifs",
    },
    {
      kind: "establish",
      camera: bounds,
      highlight: [],
      dim: false,
      callout: null,
      copy: "",
    },
    ...reveals,
    {
      kind: "takeaway",
      camera: bounds,
      highlight: [],
      dim: false,
      callout: null,
      copy: "",
    },
  ];
}

describe("map scrolly captions honour a confirmed claim-arc", () => {
  it("ships the journalist's own claim as the caption, in the confirmed order", () => {
    const story = mapStoryToChapters(framed(arcRevealBeats()), {
      title: "Soins intensifs",
      description: "Lits de soins intensifs pour 100 000 habitants",
      regionsWithData: 3,
      lang: "fr",
    });
    const walk = story.steps.map((s) => s.prose);
    // Every confirmed claim reaches the page, verbatim and in order.
    const positions = CLAIMS.map((c) => walk.indexOf(c));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it("never labels an arc beat by its POSITION in the walk (the Lazio mislabel)", () => {
    const story = mapStoryToChapters(framed(arcRevealBeats()), {
      title: "Soins intensifs",
      regionsWithData: 3,
      lang: "fr",
    });
    const walk = story.steps.map((s) => s.prose).join(" • ");
    // "le plus bas" / "le plus élevé" are RANK words. An arc is ordered by argument, so the
    // engine may not assert a rank it did not compute.
    expect(walk).not.toMatch(/le plus bas|le plus élevé|deuxième/);
  });

  it("leaves the salience path (no arc) byte-identical", () => {
    // Same three regions, no arc: the derived captions and their rank descriptors stand.
    const bounds: [number, number, number, number] = [6, 36, 19, 47];
    const salience: Beat[] = ARC_ORDER.map((region, i) => ({
      kind: "reveal",
      camera: bounds,
      highlight: [region],
      dim: true,
      callout: {
        region,
        name: ANCHORS[region]!.name,
        value: ANCHORS[region]!.value,
        text: `${ANCHORS[region]!.name} — ${ANCHORS[region]!.value}`,
      },
      copy: `${ANCHORS[region]!.name} — ${ANCHORS[region]!.value}`,
      rank: i + 1,
      rankRole: i === ARC_ORDER.length - 1 ? "tail" : undefined,
    }));
    const story = mapStoryToChapters(framed(salience), {
      title: "Soins intensifs",
      regionsWithData: 3,
      lang: "fr",
    });
    const walk = story.steps.map((s) => s.prose).join(" • ");
    expect(walk).toContain("Lombardie — 12,4, le plus élevé des 3");
    expect(walk).toContain("Calabre — 3,2, le plus bas");
  });
});

// ---------------------------------------------------------------------------
// Drift guard — the four call sites that dropped the plan.
//
// A source-level check, deliberately: the two CAMERA call sites live inside components whose
// module scope throws without a MapTiler key, so they cannot be imported here, and what went
// wrong with them is exactly a missing argument. This guard is not the render evidence — that
// is lib/loop/map-arc-render-proof.test.ts, read off a built page.
// ---------------------------------------------------------------------------

const SRC = join(import.meta.dir, "..", "src");

// Extract the text of every `fn(...)` call, bracket-matched so nested objects are included.
function callsOf(source: string, fn: string): string[] {
  const out: string[] = [];
  let from = 0;
  for (;;) {
    const at = source.indexOf(`${fn}(`, from);
    if (at === -1) return out;
    let depth = 0;
    let i = at + fn.length;
    for (; i < source.length; i++) {
      if (source[i] === "(") depth++;
      else if (source[i] === ")") {
        depth--;
        if (depth === 0) break;
      }
    }
    out.push(source.slice(at, i + 1));
    from = i + 1;
  }
}

// A meta object may be composed above the call (ScrollyMap does), so a call whose last
// argument is a bare identifier is resolved to that identifier's `const <id> = { … }` in the
// same file before the check. Without this the guard would pass on a variable name alone.
function withResolvedMeta(source: string, call: string): string {
  const lastArg = call
    .slice(call.indexOf("(") + 1, call.lastIndexOf(")"))
    .split(",")
    .pop()!
    .trim();
  if (!/^[A-Za-z_$][\w$]*$/.test(lastArg)) return call;
  const at = source.indexOf(`const ${lastArg} = {`);
  if (at === -1) return call;
  const end = source.indexOf("\n      };", at);
  return call + (end === -1 ? source.slice(at) : source.slice(at, end));
}

describe("the scrolly map track forwards the confirmed plan to its deriver", () => {
  const sites: [string, string][] = [
    ["Scrolly.tsx", "deriveSymbolStory"],
    ["Scrolly.tsx", "deriveMapStory"],
    ["ScrollySymbolMap.tsx", "deriveSymbolStory"],
    ["ScrollyMap.tsx", "deriveMapStory"],
  ];
  for (const [file, fn] of sites) {
    it(`${file} passes arcBeats into ${fn}`, () => {
      const source = readFileSync(join(SRC, file), "utf8");
      const calls = callsOf(source, fn);
      expect(calls.length).toBeGreaterThan(0);
      for (const call of calls)
        expect(withResolvedMeta(source, call)).toMatch(
          /arcBeats:\s*config\.arcBeats/,
        );
    });
  }
});

// ---------------------------------------------------------------------------
// Refusal — a malformed arc is refused, naming the malformation.
//
// UPDATED (map-storyboard-and-video-geography, Task 5 — hex-grid, the last map type to gain
// arc support): this describe block used to prove "a map type that cannot honour arcBeats is
// refused by name" against five real types (hex-grid/dot-density/locator/cartogram/route).
// Task 5 made every real map type arc-capable (see map-arc.ts's ARC_CAPABLE_MAP_TYPES and its
// own DECISION comment) — none of those five can reach that capability-refusal branch with a
// real type string any more, and mapNativeConfigErrors dispatches purely on `type`, so it has
// no seam for the deliberately-fake type map-native's own boundary test uses instead (see
// skills/map-native/tests/arc-beats-threading.test.ts's `unsupportedArcBeatsErrors` block,
// which now owns that boundary proof directly). The genuine thing left to prove at THIS layer
// — mapNativeConfigErrors, the dispatcher scrolly's own validator calls — is that a MALFORMED
// arc still gets refused, by name, on every one of these five types: an incomplete plan
// (establish with no build/payoff) is content the type CAN carry but the journalist did not
// finish, and dispatch must not swallow that check for any type it routes to.
// ---------------------------------------------------------------------------

describe("a malformed claim-arc on an arc-capable map type is REFUSED, never dropped", () => {
  // Missing `build` and `payoff` — a plan the type CAN carry, incompletely confirmed. Each
  // fixture is otherwise valid (real basemap, insight-length title, well-formed geometry) so
  // the malformed arc is the SOLE fault — the same discipline produce-cli-validation.test.ts
  // documents for its own route fixture: unrelated holes would let the assertion pass while
  // proving nothing about the arc check.
  const brokenArc = [
    { region: "Place", role: "establish" as const, text: "a claim" },
  ];

  it("names the missing beats on hex-grid / dot-density / locator / cartogram / route", () => {
    const specs: Record<string, unknown> = {
      "hex-grid": {
        type: "hex-grid",
        basemap: "world",
        title: "A hex-grid with a real insight",
        points: [
          { lon: 6.1, lat: 46.2 },
          { lon: 6.6, lat: 46.5 },
        ],
        arcBeats: [
          {
            region: "Place",
            role: "establish",
            text: "a claim",
            lon: 6.1,
            lat: 46.2,
          },
        ],
      },
      cartogram: {
        type: "cartogram",
        basemap: "world",
        title: "A cartogram with a real insight",
        values: [
          { id: "FRA", value: 68 },
          { id: "DEU", value: 84 },
        ],
        arcBeats: brokenArc,
      },
      locator: {
        type: "locator",
        basemap: "world",
        title: "A locator with a real insight",
        markers: [
          { lon: 6.1, lat: 46.2, label: "Geneva" },
          { lon: 6.6, lat: 46.5, label: "Lausanne" },
        ],
        arcBeats: brokenArc.map((b) => ({ ...b, region: "Geneva" })),
      },
      route: {
        type: "route",
        basemap: "world",
        title: "A route with a real insight",
        route: [
          [2.35, 48.85],
          [13.4, 52.52],
        ],
        arcBeats: brokenArc,
      },
      "dot-density": {
        type: "dot-density",
        basemap: "world",
        boundaries: "world",
        regionKey: "iso_a3",
        valueField: "value",
        title: "A dot-density with a real insight",
        rows: [
          { iso_a3: "FRA", value: 68 },
          { iso_a3: "DEU", value: 84 },
        ],
        arcBeats: brokenArc.map((b) => ({ ...b, region: "FRA" })),
      },
    };
    for (const [type, spec] of Object.entries(specs)) {
      const errors = mapNativeConfigErrors(spec);
      // The two faults an establish-only plan always carries: it never closes, and it never
      // rises. Both must be named — not just "an error happened somewhere".
      expect(
        errors.some((e) => e.includes("must CLOSE on a `payoff` beat")),
        `${type} must name the missing payoff, got: ${errors.join(" | ")}`,
      ).toBe(true);
      expect(
        errors.some((e) => e.includes("needs at least one `build` beat")),
        `${type} must name the missing build, got: ${errors.join(" | ")}`,
      ).toBe(true);
    }
  });

  it("still accepts a well-formed arc on a representative arc-capable type (symbol)", () => {
    const errors = mapNativeConfigErrors({
      type: "symbol",
      title: "T",
      points: [
        { lon: 9.2, lat: 45.5, value: 12.4, label: "Lombardie" },
        { lon: 12.5, lat: 41.9, value: 8.1, label: "Latium" },
      ],
      arcBeats: [
        { region: "Lombardie", role: "establish", text: "a" },
        { region: "Latium", role: "build", text: "b" },
        { region: "Lombardie", role: "payoff", text: "c" },
      ],
    });
    expect(errors.filter((e) => e.includes("arcBeats"))).toEqual([]);
  });
});
