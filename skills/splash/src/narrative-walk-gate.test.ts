import { describe, it, expect } from "bun:test";
import { narrativeWalkError, walkCapability } from "./narrative-walk-gate";
import type { AcceptedProposal } from "./producer-spec";

// ---------------------------------------------------------------------------
// A narrative visual is not produced from a plan nobody wrote — on the chain the journalist
// actually walks. Measured need: three real runs on 2026-08-05/06, the walk proposed once.
// ---------------------------------------------------------------------------
const p = (
  producer: string,
  format: string,
  spec: Record<string, unknown>,
  narrativeKind?: "story" | "stepped" | "reveal",
): AcceptedProposal =>
  ({
    id: "e1",
    producer,
    format,
    spec,
    confirmedTakeaway: "t",
    ...(narrativeKind ? { narrativeKind } : {}),
  }) as unknown as AcceptedProposal;

const WALK = [
  { category: "A", role: "establish", text: "A opens." },
  { category: "B", role: "payoff", text: "B closes." },
];

describe("narrativeWalkError — what it refuses", () => {
  it("refuses a chart scrolly with no walk, and says what to do", () => {
    const err = narrativeWalkError(
      p("scrolly", "scrolly", { nativeType: "bar", rows: [] }),
    );
    expect(err).not.toBeNull();
    expect(err!).toMatch(/step by step/i);
    // ROUTED: it names the act, not just the fault.
    expect(err!).toMatch(/their article/i);
    expect(err!).toContain("beats");
  });

  it("refuses a map video with no walk, and names ITS field", () => {
    const err = narrativeWalkError(
      p(
        "map-native",
        "video",
        { type: "choropleth", cameraMode: "guided-tour", sweepCarrier: "threshold" },
        "story",
      ),
    );
    expect(err).not.toBeNull();
    expect(err!).toContain("arcBeats");
  });

  it("refuses a BAR video with no walk — the type whose video can carry words", () => {
    expect(
      narrativeWalkError(
        p("chart-native", "video", { nativeType: "bar" }, "stepped"),
      ),
    ).not.toBeNull();
  });

  it("refuses a walk whose claims are unwritten — a skeleton is not an argument", () => {
    const skeleton = [
      { category: "A", role: "establish", text: "" },
      { category: "B", role: "payoff", text: "B closes." },
    ];
    expect(
      narrativeWalkError(
        p("scrolly", "scrolly", { nativeType: "bar", beats: skeleton }),
      ),
    ).not.toBeNull();
  });
});

describe("narrativeWalkError — what it lets through, and why", () => {
  it("accepts a confirmed walk", () => {
    expect(
      narrativeWalkError(
        p("scrolly", "scrolly", { nativeType: "bar", beats: WALK }),
      ),
    ).toBeNull();
    expect(
      narrativeWalkError(
        p(
          "map-native",
          "video",
          {
            type: "choropleth",
            cameraMode: "guided-tour",
            sweepCarrier: "threshold",
            arcBeats: WALK,
          },
          "story",
        ),
      ),
    ).toBeNull();
  });

  it("says NOTHING about a static or interactive form — they tell no story in steps", () => {
    for (const f of ["static", "interactive"])
      expect(
        narrativeWalkError(p("chart-native", f, { nativeType: "bar" })),
      ).toBeNull();
  });

  // ★ THESE TWO USED TO PIN THE HOLE. A line, a pie, a sankey were "types whose video cannot
  // carry a walk", and the gate stayed silent for them — so their kind was never asked and no
  // storyboard was ever proposed. They carry the words now, at the SEQUENCED grain: the
  // sentences follow the order written over the animation. Chosen as a reveal they still owe
  // nothing; chosen as stepped they owe their steps like any other.
  it("a LINE video chosen as a reveal owes nothing — and chosen as stepped, it owes its steps", () => {
    expect(
      narrativeWalkError(
        p("chart-native", "video", { nativeType: "line" }, "reveal"),
      ),
    ).toBeNull();
    expect(
      narrativeWalkError(
        p("chart-native", "video", { nativeType: "line" }, "stepped"),
      ),
    ).not.toBeNull();
  });

  it("the same holds for every sequenced type — words reach the reader there too", () => {
    for (const t of ["pie", "sankey", "heatmap", "stacked-area", "treemap"]) {
      expect(
        narrativeWalkError(p("chart-native", "video", { nativeType: t }, "reveal")),
      ).toBeNull();
      expect(
        narrativeWalkError(p("chart-native", "video", { nativeType: t }, "stepped")),
      ).not.toBeNull();
    }
  });

  it("says NOTHING about a type this engine does not render at all", () => {
    expect(
      narrativeWalkError(
        p("chart-native", "video", { nativeType: "no-such-chart" }),
      ),
    ).toBeNull();
  });

  it("says NOTHING about a Datawrapper form — it renders no walk of its own", () => {
    expect(
      narrativeWalkError(p("dw-chart", "video", { nativeType: "d3-bars" })),
    ).toBeNull();
  });
});

// ★ THROUGH THE SPINE, not only in isolation. A guard nobody calls guards nothing — and that is
// not hypothetical here: sub-project ③ built this same rule inside the loop, correct and
// mutation-checked, on a chain the journalist never enters. This test asserts the reach.
import { validateAccepted } from "./validate-gate";

describe("the spine gate carries the refusal", () => {
  it("validateAccepted refuses a scrolly with no confirmed walk", () => {
    const r = validateAccepted(
      p("scrolly", "scrolly", {
        nativeType: "bar",
        title: "t",
        altInsight: "a",
        source: { name: "S" },
        catField: "c",
        valField: "v",
        unit: "u",
        orientation: "horizontal",
        rows: [{ c: "A", v: 1 }],
      }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(" ")).toMatch(/step by step/i);
  });
});

describe("the image track carries its walk in its frames", () => {
  const frames = (caption: string) => [
    { id: "a", frameRef: "a.jpg", caption, alt: "x", credit: { name: "c" } },
    { id: "b", frameRef: "b.jpg", caption, alt: "y", credit: { name: "c" } },
  ];

  it("accepts an image scrolly whose frames are captioned", () => {
    expect(
      narrativeWalkError(
        p("image-native", "scrolly", { frames: frames("Étape racontée.") }),
      ),
    ).toBeNull();
  });

  it("refuses one whose captions are unwritten", () => {
    expect(
      narrativeWalkError(
        p("image-native", "scrolly", { frames: frames("  ") }),
      ),
    ).not.toBeNull();
  });
});

// The capability the CLI answers and the capability the guard refuses on must be ONE — two
// truths about the same product is how a journalist gets told "impossible" about something that
// works, which is exactly what happened on 2026-08-06.
describe("walkCapability — the queryable answer, and the guard's own", () => {
  it("says yes exactly where the guard would demand a walk", () => {
    const forms: [string, string, string, boolean][] = [
      ["chart-native", "bar", "video", true],
      // Sequenced types carry the words too, since the caption stage covers all 41.
      ["chart-native", "line", "video", true],
      ["chart-native", "pie", "video", true],
      ["chart-native", "no-such-chart", "video", false],
      ["map-native", "choropleth", "video", true],
      ["scrolly", "bar", "scrolly", true],
      ["chart-native", "bar", "static", false],
      ["dw-chart", "d3-bars", "video", false],
    ];
    for (const [producer, type, format, expected] of forms) {
      expect(walkCapability(producer, type, format).carriesWalk).toBe(expected);
      // …and the guard agrees: it demands a walk on exactly the forms that carry one.
      // A video is judged at its chosen kind — an unstated one is its own refusal, tested
      // elsewhere, so the sweep states `stepped` and reads the walk demand alone.
      const demanded =
        narrativeWalkError(
          p(producer, format, { nativeType: type }, format === "video" ? "stepped" : undefined),
        ) !== null;
      expect(demanded).toBe(expected);
    }
  });

  it("explains a refusal in terms a journalist can act on, never 'unsupported'", () => {
    const why = walkCapability("chart-native", "no-such-chart", "video").why;
    expect(why).toMatch(/not a chart type this engine renders/);
    expect(why).not.toMatch(/unsupported|invalid/i);
  });
});

// ★ A map video is not ONE thing. The guided tour and the stepped kind narrate — their families
// paint the beat's words. The REVEAL family shows none, by design (Rémy, 2026-08-06: "le reveal
// n'inclut pas des mots, c'est normal"): the camera holds and the data animates.
//
// So demanding a walk for a reveal would make a journalist write sentences that will never be
// shown — the one thing this gate may not do, and the thing it DID until this was measured.
describe("a map video's narrative kind decides whether words are owed", () => {
  it("owes a walk for the guided tour and the stepped kind", () => {
    for (const mode of [undefined, "guided-tour", "stepped"])
      expect(
        walkCapability("map-native", "choropleth", "video", mode).carriesWalk,
      ).toBe(true);
  });

  it("owes NOTHING for a reveal — it paints no words at all", () => {
    for (const mode of ["simple", "route-reveal"]) {
      const cap = walkCapability("map-native", "choropleth", "video", mode);
      expect(cap.carriesWalk).toBe(false);
      // …and it says WHY in a way a journalist can act on: choose another kind.
      expect(cap.why).toMatch(/guided tour|stepped/);
    }
  });

  it("the guard follows: a fixed-camera map video is not refused for a missing walk", () => {
    // Declared either way — as the journalist's own choice, or in the older vocabulary the map
    // engines have always read. Both are answers; neither is a default.
    expect(
      narrativeWalkError(
        p("map-native", "video", { type: "choropleth", cameraMode: "simple" }),
      ),
    ).toBeNull();
    expect(
      narrativeWalkError(
        p(
          "map-native",
          "video",
          { type: "choropleth", cameraMode: "simple" },
          "reveal",
        ),
      ),
    ).toBeNull();
  });
});

// ★ NO SILENT DEFAULT. Until 2026-08-06 a map video's kind sat at whatever the engine fell back
// to and nobody was asked — so nothing could honestly depend on it, and the guard demanded a
// storyboard for reveals that show no words. The kind is now an ANSWER or an open question, never
// an assumption.
describe("the narrative kind is answered, never assumed", () => {
  it("refuses a video that was never told which kind it is, and says how to ask", () => {
    const err = narrativeWalkError(
      p("map-native", "video", { type: "choropleth" }),
    );
    expect(err).not.toBeNull();
    expect(err!).toMatch(/narrative kind/i);
    // ROUTED: the act that resolves it — the question is ASKABLE, not recited.
    expect(err!).toContain("narrative-kinds --producer map-native");
    expect(err!).toContain("narrativeKind");
  });

  it("asks nothing where there is nothing to choose — one offer is not a question", () => {
    // A Datawrapper form renders no narrative video at all: refusing it for an unanswered
    // question would block legitimate work over a menu of none.
    expect(
      narrativeWalkError(p("dw-chart", "video", { nativeType: "d3-bars" })),
    ).toBeNull();
  });

  it("a chart video chosen as a reveal owes NO storyboard — it shows no words", () => {
    expect(
      narrativeWalkError(
        p("chart-native", "video", { nativeType: "bar" }, "reveal"),
      ),
    ).toBeNull();
  });

  it("…and the same chart chosen as stepped, with no walk, is refused", () => {
    const err = narrativeWalkError(
      p("chart-native", "video", { nativeType: "bar" }, "stepped"),
    );
    expect(err).not.toBeNull();
    expect(err!).toContain("beats");
  });

  // The engines read `cameraMode` and have never heard of `narrativeKind`. A choice that never
  // reached that field is a choice that never reached the render — the whole point of asking.
  it("refuses a map choice the spec contradicts", () => {
    const err = narrativeWalkError(
      p(
        "map-native",
        "video",
        { type: "choropleth", cameraMode: "guided-tour", arcBeats: WALK },
        "reveal",
      ),
    );
    expect(err).not.toBeNull();
    expect(err!).toContain("cameraMode");
  });

  it("refuses a map choice the spec never carried — silence drops it just as surely", () => {
    const err = narrativeWalkError(
      p(
        "map-native",
        "video",
        { type: "choropleth", arcBeats: WALK },
        "stepped",
      ),
    );
    expect(err).not.toBeNull();
    expect(err!).toContain('cameraMode to "stepped"');
  });

  it("accepts the translation done — including a route's own reveal", () => {
    expect(
      narrativeWalkError(
        p(
          "map-native",
          "video",
          { type: "route", cameraMode: "route-reveal" },
          "reveal",
        ),
      ),
    ).toBeNull();
  });
});

// ★ THROUGH THE SPINE, on the VIDEO path — which had no beat validation at all.
// `narrativeBeatErrors` ran on the scrolly branch only, so a typo'd anchor on a chart video
// reached production unchecked. Invisible while `bar` was the sole walk-capable video; a live
// hole the moment all 41 opened.
describe("the spine validates a chart VIDEO's walk", () => {
  const videoSpec = (nativeType: string, beats: unknown[]) => ({
    nativeType,
    title: "t",
    altInsight: "a",
    source: { name: "S" },
    unit: "u",
    data: "region,value\nGenève,12\nVaud,8\nValais,5\n",
    beats,
  });

  it("refuses an anchor the data does not carry, by name", () => {
    const r = validateAccepted({
      ...p("chart-native", "video", videoSpec("lollipop", [
        { category: "Atlantide", role: "establish", text: "nulle part" },
        { category: "Valais", role: "build", text: "suit" },
        { category: "Genève", role: "payoff", text: "ferme" },
      ])),
      narrativeKind: "stepped",
    } as never);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(" ")).toContain("Atlantide");
  });

  it("refuses an anchor a SEQUENCED type cannot honour", () => {
    const r = validateAccepted({
      ...p("chart-native", "video", videoSpec("pie", [
        { category: "Vaud", role: "establish", text: "d'abord" },
        { role: "build", text: "puis" },
        { role: "payoff", text: "enfin" },
      ])),
      narrativeKind: "stepped",
    } as never);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(" ")).toMatch(/order written/);
  });

  it("lets a well-formed walk through", () => {
    const r = validateAccepted({
      ...p("chart-native", "video", videoSpec("lollipop", [
        { category: "Vaud", role: "establish", text: "Vaud ouvre." },
        { category: "Valais", role: "build", text: "Le Valais suit." },
        { category: "Genève", role: "payoff", text: "Genève ferme." },
      ])),
      narrativeKind: "stepped",
    } as never);
    expect(r.ok).toBe(true);
  });
});

// ★ A STORY OWES A CARRIER. A map `story` is the Map Explainer shape; with no carrier it falls
// back to the beat-to-beat tour, i.e. to `stepped`. Rémy produced both kinds of one subject and
// could not tell them apart — this refusal is what stops the fallback from silently handing him
// the kind he ruled out.
describe("a map story is asked what makes it advance", () => {
  const mapStory = (spec: Record<string, unknown>) =>
    ({
      id: "e1",
      producer: "map-native",
      format: "video",
      confirmedTakeaway: "t",
      narrativeKind: "story",
      spec: { type: "choropleth", cameraMode: "guided-tour", ...spec },
    }) as never;

  it("refuses a story with no carrier, and says how to ask", () => {
    const err = narrativeWalkError(mapStory({ arcBeats: WALK }));
    expect(err).not.toBeNull();
    expect(err!).toContain("sweep-carriers --config");
    expect(err!).toContain("sweepCarrier");
  });

  it("accepts one that declares its carrier", () => {
    expect(
      narrativeWalkError(
        mapStory({ arcBeats: WALK, sweepCarrier: "threshold" }),
      ),
    ).toBeNull();
  });

  it("says nothing to a STEPPED map video — touring IS what it is", () => {
    expect(
      narrativeWalkError({
        id: "e1",
        producer: "map-native",
        format: "video",
        confirmedTakeaway: "t",
        narrativeKind: "stepped",
        spec: { type: "choropleth", cameraMode: "stepped", arcBeats: WALK },
      } as never),
    ).toBeNull();
  });
});
