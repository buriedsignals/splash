import { describe, it, expect } from "bun:test";
import { mapStoryToChapters } from "../src/chapters";
import type { Beat } from "../../map-native/src/map-story";

const beats: Beat[] = [
  {
    kind: "title",
    camera: [-9, 36, 31, 71],
    highlight: [],
    dim: false,
    callout: null,
    copy: "Renewables across Europe",
  },
  {
    kind: "establish",
    camera: [-9, 36, 31, 71],
    highlight: [],
    dim: false,
    callout: null,
    copy: "",
  },
  {
    kind: "reveal",
    camera: [4, 57, 31, 71],
    highlight: ["NOR"],
    dim: false,
    callout: {
      region: "NOR",
      name: "Norway",
      value: "99%",
      text: "Norway — 99%",
    },
    copy: "Norway — 99%",
  },
  {
    kind: "reveal",
    camera: [14, 49, 24, 55],
    highlight: ["POL"],
    dim: false,
    callout: {
      region: "POL",
      name: "Poland",
      value: "21%",
      text: "Poland — 21%",
    },
    copy: "Poland — 21%",
  },
  {
    kind: "takeaway",
    camera: [-9, 36, 31, 71],
    highlight: [],
    dim: false,
    callout: null,
    copy: "North high, south low",
  },
];

describe("mapStoryToChapters", () => {
  const meta = {
    title: "Renewables across Europe",
    description: "Share of electricity from renewables, 2024",
    source: { name: "Ember", url: "https://example.org" },
    regionsWithData: 8,
  };
  it("emits title → OVERVIEW → reveals → TAKEAWAY; both title and overview carry the description", () => {
    const story = mapStoryToChapters(beats, meta);
    // beats: title(0) establish(1) reveal NOR(2) reveal POL(3) takeaway(4)
    expect(story.steps.map((s) => s.ref)).toEqual([0, 1, 2, 3, 4]);
    expect(story.steps[0].prose).toBe(
      "Share of electricity from renewables, 2024",
    );
    // step 1 is the OVERVIEW (establish beat) — carries the description
    expect(story.steps[1].ref).toBe(1);
    expect(story.steps[1].prose).toBe(
      "Share of electricity from renewables, 2024",
    );
    // the title never appears as a step caption
    expect(story.steps.some((s) => s.prose === meta.title)).toBe(false);
  });
  it("adds a rank descriptor: first reveal = highest (of N), last reveal = lowest", () => {
    const story = mapStoryToChapters(beats, meta);
    expect(story.steps[2].prose).toBe(
      "Norway — 99%, the highest of the 8 shown",
    );
    expect(story.steps[3].prose).toBe("Poland — 21%, the lowest");
  });
  it("gives EVERY magnitude reveal a rank descriptor, incl. the middle leaders (F11)", () => {
    const mk = (
      name: string,
      value: string,
      rank: number,
      rankRole: "leader" | "tail",
    ): Beat => ({
      kind: "reveal",
      camera: [0, 0, 1, 1],
      highlight: [name],
      dim: true,
      callout: { region: name, name, value, text: `${name} — ${value}` },
      copy: `${name} — ${value}`,
      pattern: "magnitude",
      rank,
      rankRole,
    });
    const ranked: Beat[] = [
      {
        kind: "title",
        camera: [0, 0, 1, 1],
        highlight: [],
        dim: false,
        callout: null,
        copy: "T",
      },
      {
        kind: "establish",
        camera: [0, 0, 1, 1],
        highlight: [],
        dim: false,
        callout: null,
        copy: "",
      },
      mk("Malta", "82 nights", 1, "leader"),
      mk("Cyprus", "74 nights", 2, "leader"),
      mk("Greece", "71 nights", 3, "leader"),
      mk("Norway", "1 night", 16, "tail"),
      {
        kind: "takeaway",
        camera: [0, 0, 1, 1],
        highlight: [],
        dim: false,
        callout: null,
        copy: "",
      },
    ];
    const story = mapStoryToChapters(ranked, { ...meta, regionsWithData: 16 });
    const proses = story.steps
      .filter(
        (s) =>
          typeof s.ref === "number" &&
          (s.ref as number) >= 2 &&
          (s.ref as number) <= 5,
      )
      .map((s) => s.prose);
    expect(proses).toEqual([
      "Malta — 82 nights, the highest of the 16 shown",
      "Cyprus — 74 nights, the second",
      "Greece — 71 nights, the third",
      "Norway — 1 night, the lowest",
    ]);
  });

  it("always emits the takeaway (last step) with its copy", () => {
    const story = mapStoryToChapters(beats, meta);
    const last = story.steps[story.steps.length - 1];
    expect(last.ref).toBe(4);
    expect(last.prose).toBe("North high, south low");
  });
  it("emits the takeaway even with no copy, falling back to the description", () => {
    const noCopyTakeaway: Beat[] = [
      beats[0],
      beats[1],
      beats[2],
      beats[3],
      { ...beats[4], copy: "" },
    ];
    const story = mapStoryToChapters(noCopyTakeaway, meta);
    const last = story.steps[story.steps.length - 1];
    expect(last.ref).toBe(4);
    expect(last.prose).toBe("Share of electricity from renewables, 2024");
  });
  it("carries title/description/source on the story and centres cards", () => {
    const story = mapStoryToChapters(beats, meta);
    expect(story.title).toBe("Renewables across Europe");
    expect(story.description).toBe(
      "Share of electricity from renewables, 2024",
    );
    expect(story.source).toEqual({ name: "Ember", url: "https://example.org" });
    expect(story.steps.every((s) => s.align === "center")).toBe(true);
  });
  it("a single reveal gets no rank descriptor", () => {
    const one: Beat[] = [beats[0], beats[1], beats[2], beats[4]]; // title, establish, NOR, takeaway
    const story = mapStoryToChapters(one, { ...meta, regionsWithData: 1 });
    // steps: title(0) overview(1) reveal NOR(2) takeaway(3)
    expect(story.steps.map((s) => s.ref)).toEqual([0, 1, 2, 3]);
    expect(story.steps.find((s) => s.ref === 2)?.prose).toBe("Norway — 99%");
  });
});

// Temporal beats: reveals are ordered earliest→latest and tagged with
// pattern/seqIndex/seqTotal by deriveMapStory. The prose must read as a SEQUENCE.
const temporalBeats: Beat[] = [
  {
    kind: "title",
    camera: [-9, 36, 31, 71],
    highlight: [],
    dim: false,
    callout: null,
    copy: "Marriage equality spread over time",
  },
  {
    kind: "establish",
    camera: [-9, 36, 31, 71],
    highlight: [],
    dim: false,
    callout: null,
    copy: "",
  },
  {
    kind: "reveal",
    camera: [4, 50, 8, 54],
    highlight: ["NLD"],
    dim: true,
    callout: {
      region: "NLD",
      name: "Netherlands",
      value: "2001",
      text: "Netherlands — 2001",
    },
    copy: "Netherlands — 2001",
    pattern: "temporal",
    seqIndex: 0,
    seqTotal: 3,
    seqYear: 2001,
    seqYearFirst: 2001,
  },
  {
    kind: "reveal",
    camera: [2, 42, 8, 51],
    highlight: ["FRA"],
    dim: true,
    callout: {
      region: "FRA",
      name: "France",
      value: "2013",
      text: "France — 2013",
    },
    copy: "France — 2013",
    pattern: "temporal",
    seqIndex: 1,
    seqTotal: 3,
    seqYear: 2013,
    seqYearFirst: 2001,
    seqYearPrev: 2001,
  },
  {
    kind: "reveal",
    camera: [97, 5, 106, 20],
    highlight: ["THA"],
    dim: true,
    callout: {
      region: "THA",
      name: "Thailand",
      value: "2025",
      text: "Thailand — 2025",
    },
    copy: "Thailand — 2025",
    pattern: "temporal",
    seqIndex: 2,
    seqTotal: 3,
    seqYear: 2025,
    seqYearFirst: 2001,
    seqYearPrev: 2013,
  },
  {
    kind: "takeaway",
    camera: [-9, 36, 31, 71],
    highlight: [],
    dim: false,
    callout: null,
    copy: "A wave from 2001 to 2025",
  },
];

describe("mapStoryToChapters — temporal pattern", () => {
  const meta = {
    title: "Marriage equality spread over time",
    description: "The year same-sex marriage took effect in each country",
    source: { name: "Wikipedia", url: "https://example.org" },
    regionsWithData: 36,
  };

  it("words temporal reveals as an informative sequence (ordinal + interval), never highest/lowest, never a bare 'then'", () => {
    const story = mapStoryToChapters(temporalBeats, meta);
    const reveals = story.steps.filter((s) => s.prose.includes("—"));
    expect(reveals[0].prose).toBe("Netherlands — 2001, the first");
    // interior: ordinal + interval to the previous reveal (2013 − 2001 = 12).
    expect(reveals[1].prose).toBe("France — 2013, the second, 12 years later");
    // last: most recent + span since the first (2025 − 2001 = 24).
    expect(reveals[2].prose).toBe(
      "Thailand — 2025, the most recent, 24 years after the first",
    );
    for (const r of reveals) {
      expect(r.prose.toLowerCase()).not.toContain("highest");
      expect(r.prose.toLowerCase()).not.toContain("lowest");
      // never a bare connective
      expect(r.prose).not.toMatch(/,\s*(then|next)\s*$/i);
    }
  });

  it("words temporal reveals in French when meta.lang is fr — no English leak", () => {
    const story = mapStoryToChapters(temporalBeats, { ...meta, lang: "fr" });
    const reveals = story.steps.filter((s) => s.prose.includes("—"));
    expect(reveals[0].prose).toBe("Netherlands — 2001, le premier");
    expect(reveals[1].prose).toBe(
      "France — 2013, le deuxième, 12 ans plus tard",
    );
    expect(reveals[2].prose).toBe(
      "Thailand — 2025, le plus récent, 24 ans après le premier",
    );
    const englishTells = [
      "the first",
      "the second",
      "the most recent",
      "after the first",
      "years",
      "later",
    ];
    for (const r of reveals) {
      for (const tell of englishTells) {
        expect(r.prose.toLowerCase()).not.toContain(tell);
      }
    }
  });

  it("words temporal reveals in German when meta.lang is de — no English leak (the measured leak)", () => {
    const story = mapStoryToChapters(temporalBeats, { ...meta, lang: "de" });
    const reveals = story.steps.filter((s) => s.prose.includes("—"));
    expect(reveals[0].prose).toBe("Netherlands — 2001, der erste");
    expect(reveals[1].prose).toBe("France — 2013, der zweite, 12 Jahre später");
    expect(reveals[2].prose).toBe(
      "Thailand — 2025, der neueste, 24 Jahre nach dem ersten",
    );
  });

  it("words temporal reveals in Italian when meta.lang is it — no English leak (the measured leak)", () => {
    const story = mapStoryToChapters(temporalBeats, { ...meta, lang: "it" });
    const reveals = story.steps.filter((s) => s.prose.includes("—"));
    expect(reveals[0].prose).toBe("Netherlands — 2001, il primo");
    expect(reveals[1].prose).toBe("France — 2013, il secondo, 12 anni dopo");
    expect(reveals[2].prose).toBe(
      "Thailand — 2025, il più recente, 24 anni dopo il primo",
    );
  });
});

describe("mapStoryToChapters — French magnitude descriptors (lang: fr)", () => {
  const meta = {
    title: "Renewables across Europe",
    description: "Share of electricity from renewables, 2024",
    source: { name: "Ember", url: "https://example.org" },
    regionsWithData: 8,
    lang: "fr",
  };

  it("translates the highest/lowest descriptors, no English leak", () => {
    const story = mapStoryToChapters(beats, meta);
    expect(story.steps[2].prose).toBe("Norway — 99%, le plus élevé des 8");
    expect(story.steps[3].prose).toBe("Poland — 21%, le plus bas");
    expect(story.steps[2].prose.toLowerCase()).not.toContain("highest");
    expect(story.steps[3].prose.toLowerCase()).not.toContain("lowest");
  });

  it("translates the middle-leader ordinal (F11) into French", () => {
    const mk = (
      name: string,
      value: string,
      rank: number,
      rankRole: "leader" | "tail",
    ): Beat => ({
      kind: "reveal",
      camera: [0, 0, 1, 1],
      highlight: [name],
      dim: true,
      callout: { region: name, name, value, text: `${name} — ${value}` },
      copy: `${name} — ${value}`,
      pattern: "magnitude",
      rank,
      rankRole,
    });
    const ranked: Beat[] = [
      {
        kind: "title",
        camera: [0, 0, 1, 1],
        highlight: [],
        dim: false,
        callout: null,
        copy: "T",
      },
      {
        kind: "establish",
        camera: [0, 0, 1, 1],
        highlight: [],
        dim: false,
        callout: null,
        copy: "",
      },
      mk("Malta", "82 nights", 1, "leader"),
      mk("Cyprus", "74 nights", 2, "leader"),
      mk("Greece", "71 nights", 3, "leader"),
      mk("Norway", "1 night", 16, "tail"),
      {
        kind: "takeaway",
        camera: [0, 0, 1, 1],
        highlight: [],
        dim: false,
        callout: null,
        copy: "",
      },
    ];
    const story = mapStoryToChapters(ranked, { ...meta, regionsWithData: 16 });
    const proses = story.steps
      .filter(
        (s) =>
          typeof s.ref === "number" &&
          (s.ref as number) >= 2 &&
          (s.ref as number) <= 5,
      )
      .map((s) => s.prose);
    expect(proses).toEqual([
      "Malta — 82 nights, le plus élevé des 16",
      "Cyprus — 74 nights, le deuxième",
      "Greece — 71 nights, le troisième",
      "Norway — 1 night, le plus bas",
    ]);
  });
});

describe("mapStoryToChapters — German and Italian magnitude descriptors (the measured leak)", () => {
  const mk = (
    name: string,
    value: string,
    rank: number,
    rankRole: "leader" | "tail",
  ): Beat => ({
    kind: "reveal",
    camera: [0, 0, 1, 1],
    highlight: [name],
    dim: true,
    callout: { region: name, name, value, text: `${name} — ${value}` },
    copy: `${name} — ${value}`,
    pattern: "magnitude",
    rank,
    rankRole,
  });
  const ranked: Beat[] = [
    {
      kind: "title",
      camera: [0, 0, 1, 1],
      highlight: [],
      dim: false,
      callout: null,
      copy: "T",
    },
    {
      kind: "establish",
      camera: [0, 0, 1, 1],
      highlight: [],
      dim: false,
      callout: null,
      copy: "",
    },
    mk("Malta", "82 nights", 1, "leader"),
    mk("Cyprus", "74 nights", 2, "leader"),
    mk("Greece", "71 nights", 3, "leader"),
    mk("Norway", "1 night", 16, "tail"),
    {
      kind: "takeaway",
      camera: [0, 0, 1, 1],
      highlight: [],
      dim: false,
      callout: null,
      copy: "",
    },
  ];
  const proseOf = (story: ReturnType<typeof mapStoryToChapters>) =>
    story.steps
      .filter(
        (s) =>
          typeof s.ref === "number" &&
          (s.ref as number) >= 2 &&
          (s.ref as number) <= 5,
      )
      .map((s) => s.prose);

  it("translates the highest/lowest/middle-leader ordinal into German, no English leak", () => {
    const meta = {
      title: "Renewables across Europe",
      description: "Share of electricity from renewables, 2024",
      source: { name: "Ember", url: "https://example.org" },
      regionsWithData: 16,
      lang: "de",
    };
    const story = mapStoryToChapters(ranked, meta);
    expect(proseOf(story)).toEqual([
      "Malta — 82 nights, der höchste von 16",
      "Cyprus — 74 nights, der zweite",
      "Greece — 71 nights, der dritte",
      "Norway — 1 night, der niedrigste",
    ]);
  });

  it("translates the highest/lowest/middle-leader ordinal into Italian, no English leak", () => {
    const meta = {
      title: "Renewables across Europe",
      description: "Share of electricity from renewables, 2024",
      source: { name: "Ember", url: "https://example.org" },
      regionsWithData: 16,
      lang: "it",
    };
    const story = mapStoryToChapters(ranked, meta);
    expect(proseOf(story)).toEqual([
      "Malta — 82 nights, il più alto dei 16",
      "Cyprus — 74 nights, il secondo",
      "Greece — 71 nights, il terzo",
      "Norway — 1 night, il più basso",
    ]);
  });
});

// ---------------------------------------------------------------------------
// A REVEAL WITH NO VALUE — the locator family.
//
// Measured on a delivered page (a French locator scrolly, produced through
// skills/scrolly/scripts/produce.mjs and read out of the built HTML):
//
//   "Pont d'Austerlitz — , the highest of the 5 shown"
//   "Notre-Dame de Paris —"
//
// Three things went wrong in one line. A locator marker carries no number, so the
// value slot rendered empty and left the em dash dangling; a rank descriptor was
// asserted about a walk that ranked nothing; and the marker's own note — the one
// sentence a journalist actually wrote — was thrown away in favour of the hole.
// ---------------------------------------------------------------------------
describe("mapStoryToChapters — a reveal whose callout carries no value", () => {
  const marker = (name: string, note: string): Beat => ({
    kind: "reveal",
    camera: [0, 0, 1, 1],
    highlight: [name],
    dim: true,
    callout: { region: name, name, value: "", text: note },
    copy: note,
    pattern: "categorical",
  });
  const framed = (reveals: Beat[]): Beat[] => [
    {
      kind: "title",
      camera: [0, 0, 1, 1],
      highlight: [],
      dim: false,
      callout: null,
      copy: "T",
    },
    {
      kind: "establish",
      camera: [0, 0, 1, 1],
      highlight: [],
      dim: false,
      callout: null,
      copy: "",
    },
    ...reveals,
    {
      kind: "takeaway",
      camera: [0, 0, 1, 1],
      highlight: [],
      dim: false,
      callout: null,
      copy: "La Seine a servi de scène continue.",
    },
  ];
  const meta = {
    title: "Les cinq sites de la cérémonie d'ouverture",
    description: "Cinq lieux au bord de la Seine, le 26 juillet 2024.",
    source: { name: "Paris 2024", url: "https://example.org" },
    regionsWithData: 5,
    lang: "fr",
  };
  const revealProse = (story: ReturnType<typeof mapStoryToChapters>) =>
    story.steps.filter((s) => s.id.endsWith("-reveal")).map((s) => s.prose);

  it("ships the marker's own note, not a name with an empty value slot", () => {
    const story = mapStoryToChapters(
      framed([
        marker(
          "Pont d'Austerlitz",
          "Ligne de départ où la parade des 85 bateaux est entrée sur la Seine.",
        ),
        marker(
          "Notre-Dame de Paris",
          "La flottille est passée devant la cathédrale.",
        ),
        marker("Tour Eiffel", "Site du final où la flamme a été allumée."),
      ]),
      meta,
    );
    expect(revealProse(story)).toEqual([
      "Ligne de départ où la parade des 85 bateaux est entrée sur la Seine.",
      "La flottille est passée devant la cathédrale.",
      "Site du final où la flamme a été allumée.",
    ]);
  });

  it("never leaves a dangling separator or an empty slot in any caption", () => {
    const story = mapStoryToChapters(
      framed([
        marker("Pont d'Austerlitz", "Ligne de départ."),
        marker("Notre-Dame de Paris", "La flottille est passée."),
        marker("Tour Eiffel", "Site du final."),
      ]),
      meta,
    );
    for (const s of story.steps) {
      expect(s.prose.trim()).not.toMatch(/[—–-]\s*$/);
      expect(s.prose).not.toMatch(/—\s*,/);
    }
  });

  it("asserts no rank over a walk that ranked nothing", () => {
    const story = mapStoryToChapters(
      framed([
        marker("Pont d'Austerlitz", "Ligne de départ."),
        marker("Notre-Dame de Paris", "La flottille est passée."),
        marker("Tour Eiffel", "Site du final."),
      ]),
      meta,
    );
    for (const p of revealProse(story)) {
      expect(p).not.toMatch(/plus élevé|plus bas|highest|lowest/);
    }
  });

  it("falls back to the place's NAME when the deriver wrote no note", () => {
    const nameless = marker("Pont Alexandre III", "");
    const story = mapStoryToChapters(
      framed([nameless, marker("Tour Eiffel", "Site du final.")]),
      meta,
    );
    expect(revealProse(story)[0]).toBe("Pont Alexandre III");
  });

  it("an authored arc beat with no claim text reads as the place, not as a stub", () => {
    // applyMapArc resolves a locator anchor to value:"" (a marker has no number), and an
    // arc MAY be anchors only — roles and claim text are optional on a confirmed plan.
    const authored: Beat = {
      kind: "reveal",
      camera: [0, 0, 1, 1],
      highlight: ["Rue du Stand 26"],
      dim: true,
      callout: {
        region: "Rue du Stand 26",
        name: "Rue du Stand 26",
        value: "",
        text: "",
      },
      copy: "",
      authored: true,
    };
    const story = mapStoryToChapters(framed([authored]), meta);
    expect(revealProse(story)[0]).toBe("Rue du Stand 26");
  });

  it("a CATEGORICAL walk keeps its value but takes no rank descriptor", () => {
    // The locator's categorized regime walks categories in alphabetical order — position
    // is not rank there, so ranking language would be a lie about the data.
    const category = (name: string, value: string): Beat => ({
      kind: "reveal",
      camera: [0, 0, 1, 1],
      highlight: [name],
      dim: true,
      callout: { region: name, name, value, text: `${name} — ${value}` },
      copy: `${name} — ${value}`,
      pattern: "categorical",
    });
    const story = mapStoryToChapters(
      framed([
        category("Écoles", "3 sites"),
        category("Hôpitaux", "1 site"),
        category("Mairies", "2 sites"),
      ]),
      meta,
    );
    expect(revealProse(story)).toEqual([
      "Écoles — 3 sites",
      "Hôpitaux — 1 site",
      "Mairies — 2 sites",
    ]);
  });
});

// ---------------------------------------------------------------------------
// THE MIRROR: an empty NAME slot.
//
// Found while sweeping the sibling caption paths, and then measured on a render — a
// symbol scrolly built from a CSV with no label column (SymbolPoint.label is optional,
// and lib/loop/assemble/map-native.ts only sets it when a label column exists) delivered:
//     "— 220 MW, le plus élevé des 4"
//     "— 90 MW, le plus bas"
// Same template, same hole, other end. One helper answers both.
// ---------------------------------------------------------------------------
describe("mapStoryToChapters — a reveal whose callout carries no name", () => {
  const point = (value: string, rank: number, role: "leader" | "tail"): Beat => ({
    kind: "reveal",
    camera: [0, 0, 1, 1],
    highlight: [""],
    dim: true,
    callout: { region: "", name: "", value, text: `— ${value}` },
    copy: `— ${value}`,
    pattern: "magnitude",
    rank,
    rankRole: role,
  });
  const story = mapStoryToChapters(
    [
      {
        kind: "title",
        camera: [0, 0, 1, 1],
        highlight: [],
        dim: false,
        callout: null,
        copy: "T",
      },
      {
        kind: "establish",
        camera: [0, 0, 1, 1],
        highlight: [],
        dim: false,
        callout: null,
        copy: "",
      },
      point("220 MW", 1, "leader"),
      point("90 MW", 4, "tail"),
      {
        kind: "takeaway",
        camera: [0, 0, 1, 1],
        highlight: [],
        dim: false,
        callout: null,
        copy: "Quatre sites.",
      },
    ],
    {
      title: "La puissance installée",
      description: "Puissance installée par site, 2026.",
      source: { name: "OFEN", url: "https://example.org" },
      regionsWithData: 4,
      lang: "fr",
    },
  );

  it("drops the separator instead of opening the caption with it", () => {
    const reveals = story.steps.filter((s) => s.id.endsWith("-reveal"));
    expect(reveals.map((s) => s.prose)).toEqual([
      "220 MW, le plus élevé des 4",
      "90 MW, le plus bas",
    ]);
  });

  it("keeps the rank descriptor — the walk IS ranked here, only the label is missing", () => {
    expect(story.steps.some((s) => s.prose.includes("le plus élevé"))).toBe(true);
  });

  it("leaves no caption starting on a separator", () => {
    for (const s of story.steps) expect(s.prose).not.toMatch(/^\s*[—–]/);
  });
});
