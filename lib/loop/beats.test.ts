import { test, expect, describe } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { draftBeats, applyBeats } from "./beats";
import { freezeInput } from "./freeze";
import { unauthoredBeats, type RunManifest, type RunElement } from "./manifest";
import type { AuthoredBeat } from "../brain/verify-beats";

const SEA_ICE =
  "year,extent\n1979,7.0\n1995,6.1\n2003,6.1\n2007,4.3\n2012,3.6\n2020,3.9\n2025,4.3";

function runWith(csv = SEA_ICE, nativeType = "line") {
  const runDir = mkdtempSync(join(tmpdir(), "loop-beats-run-"));
  const src = join(runDir, "src.csv");
  writeFileSync(src, csv);
  const run: RunManifest = {
    runId: "t",
    schemaVersion: 4,
    route: "article",
    channel: "article-web",
    input: { data: freezeInput(runDir, src, "data") },
    sources: {
      mode: "real",
      data: { kind: "public", label: "NSIDC Sea Ice Index" },
    },
    orient: {
      profile: {
        columns: ["year", "extent"],
        numericColumns: ["year", "extent"],
        rowCount: 7,
      },
      supportsPoint: true,
    },
    elements: [
      {
        id: "e1",
        angle: {
          confirmedTakeaway: "The Arctic's September sea ice has not recovered",
          altInsight:
            "September minimum sea-ice extent fell from 7 to 4.3 million km² between 1979 and 2025.",
          unit: "million km²",
        },
        proposal: {
          options: [
            {
              id: "line-scrolly",
              nativeType,
              engine: "chart-native",
              format: "scrolly",
              why: "a series with a shape a reader can be walked through",
            },
          ],
          excluded: [],
          chosenId: "line-scrolly",
        },
      },
    ],
    events: [],
  };
  return { run, runDir };
}

describe("draftBeats — the verb", () => {
  test("hands over a plan whose every claim is unwritten", () => {
    const { run, runDir } = runWith();
    const r = draftBeats(run, run.elements[0]!, runDir);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const beats = r.value.narrative!.beats;
    expect(beats.length).toBeGreaterThanOrEqual(3);
    expect(beats.every((b) => b.text === "")).toBe(true);
    expect(beats.every((b) => b.draftText.length > 0)).toBe(true);
    expect(unauthoredBeats(r.value)).toEqual(beats.map((b) => b.id));
    rmSync(runDir, { recursive: true, force: true });
  });

  test("follows the engine's caption-unit rule — the long axis label stays out", () => {
    // chart-story.ts: repeating the axis subtitle in every caption is clumsy and duplicates
    // furniture the chart already shows. A SHORT unit is carried; "million km²" is not one.
    const { run, runDir } = runWith();
    const long = draftBeats(run, run.elements[0]!, runDir);
    expect(long.ok && long.value.narrative!.beats[0]!.draftText).toBe(
      "1979 — 7",
    );

    const short: RunManifest = {
      ...run,
      elements: [
        {
          ...run.elements[0]!,
          angle: { ...run.elements[0]!.angle!, unit: "%" },
        },
      ],
    };
    const r = draftBeats(short, short.elements[0]!, runDir);
    expect(r.ok && r.value.narrative!.beats[0]!.draftText).toBe("1979 — 7%");
    rmSync(runDir, { recursive: true, force: true });
  });

  test("REFUSES rather than throws when the frozen input cannot be read", () => {
    const { run, runDir } = runWith();
    const broken: RunManifest = {
      ...run,
      input: { data: { path: "input/gone.csv", sha256: "0".repeat(64) } },
    };
    const r = draftBeats(broken, broken.elements[0]!, runDir);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.code).toBe("engine-failed");
    expect(r.message).toContain("gone.csv");
    rmSync(runDir, { recursive: true, force: true });
  });

  test("REFUSES a type the engine's beats override does not carry, in its words", () => {
    const { run, runDir } = runWith(
      "country,spend,life\nUS,10,78\nJP,4,84\nFR,5,82\nDE,6,81",
      "scatter",
    );
    const r = draftBeats(run, run.elements[0]!, runDir);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.code).toBe("invalid-request");
    expect(r.message).toContain("scatter");
    rmSync(runDir, { recursive: true, force: true });
  });

  test("REFUSES an element with no chosen form — there is nothing to draft for", () => {
    const { run, runDir } = runWith();
    const el: RunElement = { ...run.elements[0]!, proposal: undefined };
    const r = draftBeats(run, el, runDir);
    expect(r.ok).toBe(false);
    rmSync(runDir, { recursive: true, force: true });
  });

  test("honours the journalist's own anchors — the re-draft door", () => {
    const { run, runDir } = runWith();
    const r = draftBeats(run, run.elements[0]!, runDir, {
      anchors: ["2012", "2020", "2025"],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.narrative!.beats.map((b) => b.anchor.value)).toEqual([
      "2012",
      "2020",
      "2025",
    ]);
    rmSync(runDir, { recursive: true, force: true });
  });
});

describe("applyBeats — the one production caller of the guard", () => {
  function drafted() {
    const { run, runDir } = runWith();
    const r = draftBeats(run, run.elements[0]!, runDir);
    if (!r.ok) throw new Error(r.message);
    return {
      run: { ...run, elements: [r.value] } as RunManifest,
      runDir,
      beats: r.value.narrative!.beats,
    };
  }

  const words = (ids: string[], roles: string[]): AuthoredBeat[] =>
    ids.map((id, i) => ({
      id,
      role: roles[i] as AuthoredBeat["role"],
      text: `Une phrase de journaliste, la ${i + 1}re.`,
    }));

  test("writes the journalist's sentences and leaves the input untouched", () => {
    const { run, beats, runDir } = drafted();
    const authored = words(
      beats.map((b) => b.id),
      beats.map((b) => b.role),
    );
    const next = applyBeats(run, "e1", authored);
    expect(unauthoredBeats(next.elements[0]!)).toEqual([]);
    expect(next.elements[0]!.narrative!.beats[0]!.text).toContain(
      "journaliste",
    );
    // …and the draft is still there to show again.
    expect(next.elements[0]!.narrative!.beats[0]!.draftText).toBe(
      beats[0]!.draftText,
    );
    // the manifest handed in is NOT mutated
    expect(unauthoredBeats(run.elements[0]!).length).toBe(beats.length);
    rmSync(runDir, { recursive: true, force: true });
  });

  test("throws with the guard's own message when the plan came back changed", () => {
    const { run, beats, runDir } = drafted();
    const authored = words(
      beats.map((b) => b.id),
      beats.map((b) => b.role),
    ).reverse();
    expect(() => applyBeats(run, "e1", authored)).toThrow(/order changed/);
    rmSync(runDir, { recursive: true, force: true });
  });

  test("throws on an invented number, naming it", () => {
    const { run, beats, runDir } = drafted();
    const authored = words(
      beats.map((b) => b.id),
      beats.map((b) => b.role),
    );
    authored[1]!.text = "La surface est tombée à 1,2 million de km².";
    expect(() => applyBeats(run, "e1", authored)).toThrow(/1\.2/);
    rmSync(runDir, { recursive: true, force: true });
  });

  test("throws on an unknown element, and on an element with no drafted plan", () => {
    const { run, beats, runDir } = drafted();
    const authored = words(
      beats.map((b) => b.id),
      beats.map((b) => b.role),
    );
    expect(() => applyBeats(run, "nope", authored)).toThrow(/nope/);
    const bare: RunManifest = {
      ...run,
      elements: [{ ...run.elements[0]!, narrative: undefined }],
    };
    expect(() => applyBeats(bare, "e1", authored)).toThrow(/no drafted plan/);
    rmSync(runDir, { recursive: true, force: true });
  });
});

// THE IMAGE TRACK — the walk of an image scrolly is one beat per DECLARED PHOTOGRAPH, in the
// order the journalist declared them. It exists because the loop could not reach produce() for
// image-native AT ALL: its only format is scrolly, `nextActionsForElement` sent it to
// `draft-beats`, `suggestBeats` refused it (no CSV drafts a photograph), and draftBeats/applyBeats
// are the only writers of `el.narrative` — so the run answered the same impossible action forever
// while assembleImageNative refuses a frame/beat count mismatch on the other side.
describe("draftBeats — the image track", () => {
  function imageRun(frameCount: number) {
    const runDir = mkdtempSync(join(tmpdir(), "loop-beats-image-"));
    const src = join(runDir, "src.csv");
    writeFileSync(src, "note\nan image story has no data axis\n");
    const run: RunManifest = {
      runId: "t-image",
      schemaVersion: 4,
      route: "article",
      channel: "article-web",
      input: {
        data: freezeInput(runDir, src, "data"),
        images: {
          dir: runDir,
          frames: Array.from({ length: frameCount }, (_, i) => ({
            frameRef: `frame-${i + 1}.jpg`,
            alt: `Alt text for frame ${i + 1}`,
            credit: { name: "M. Rossi / Heidi.news" },
          })),
        },
      },
      sources: {
        mode: "real",
        data: { kind: "public", label: "Heidi.news" },
      },
      orient: {
        profile: { columns: ["note"], numericColumns: [], rowCount: 1 },
        supportsPoint: false,
      },
      elements: [
        {
          id: "e1",
          angle: {
            confirmedTakeaway: "The canal split the village in two",
            altInsight: "Three photographs tracing the waterway",
            unit: "",
          },
          proposal: {
            options: [
              {
                id: "image-scrolly",
                nativeType: "image-scrolly",
                engine: "image-native",
                format: "scrolly",
                why: "the journalist's own photographs, walked in sequence",
              },
            ],
            excluded: [],
            chosenId: "image-scrolly",
          },
        },
      ],
      events: [],
    };
    return { run, runDir };
  }

  test("drafts one unwritten beat per declared photograph, in declaration order", () => {
    const { run, runDir } = imageRun(3);
    const r = draftBeats(run, run.elements[0]!, runDir);
    expect(r.ok ? "drafted" : r.message).toBe("drafted");
    if (!r.ok) return;
    const beats = r.value.narrative!.beats;
    expect(beats.map((b) => b.anchor.value)).toEqual([
      "frame-1.jpg",
      "frame-2.jpg",
      "frame-3.jpg",
    ]);
    expect(beats.map((b) => b.role)).toEqual(["establish", "build", "payoff"]);
    // Every claim unwritten, and the DRAFT itself empty: Splash never looked at the photograph
    // (no vision matching), so it has nothing to suggest and says so by suggesting nothing.
    expect(beats.every((b) => b.text === "")).toBe(true);
    expect(beats.every((b) => b.draftText === "")).toBe(true);
    expect(unauthoredBeats(r.value)).toEqual(beats.map((b) => b.id));
    rmSync(runDir, { recursive: true, force: true });
  });

  test("the drafted plan is authorable — the journalist's captions land on it", () => {
    const { run, runDir } = imageRun(3);
    const drafted = draftBeats(run, run.elements[0]!, runDir);
    if (!drafted.ok) throw new Error(drafted.message);
    const withPlan: RunManifest = { ...run, elements: [drafted.value] };
    const authored: AuthoredBeat[] = drafted.value.narrative!.beats.map(
      (b, i) => ({
        id: b.id,
        // establish → build → payoff. A three-beat walk cannot carry a `turn`: arcErrors needs
        // at least one build between the two ends, so a turn only becomes available from four
        // photographs on (the engine's floor is 3, its cap 6).
        role: (["establish", "build", "payoff"] as const)[i]!,
        text: `The journalist's own sentence about photograph ${i + 1}.`,
      }),
    );
    const ready = applyBeats(withPlan, "e1", authored);
    expect(unauthoredBeats(ready.elements[0]!)).toEqual([]);
    rmSync(runDir, { recursive: true, force: true });
  });

  test("refuses a walk of two photographs — two frames is not a claim-arc", () => {
    const { run, runDir } = imageRun(2);
    const r = draftBeats(run, run.elements[0]!, runDir);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.message).toContain("not an argument");
    rmSync(runDir, { recursive: true, force: true });
  });

  test("refuses when no photographs are declared with the run", () => {
    const { run, runDir } = imageRun(3);
    const bare: RunManifest = {
      ...run,
      input: { data: run.input.data },
    };
    const r = draftBeats(bare, bare.elements[0]!, runDir);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.message).toContain("photograph");
    rmSync(runDir, { recursive: true, force: true });
  });
});
