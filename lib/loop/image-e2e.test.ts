import { fileArtifact } from "./manifest";
// THE PROOF that the loop builds an image scrolly, not just that the assembler composes a
// story for it. Modelled on lib/loop/map-e2e.test.ts and lib/loop/beats-render-proof.test.ts:
// a real produce() call, driving the real image-native → scrolly build, measured off the
// delivered page's OWN DOM (never the config, never a grep of the bundle — a single-file bundle
// inlines everything and the page computes what it shows after it loads).
//
// OPT-IN (SPLASH_IMAGE_E2E=1): a real prep (sharp) + scrolly build (Vite) + a Playwright read of
// the built page is seconds, not milliseconds, and the fixture images plus a browser have no
// business running on every `bun test`. Same discipline as map-e2e.test.ts and
// beats-render-proof.test.ts.
//
// THE NARRATIVE COMES FROM THE LOOP'S OWN ROUTE — draft-beats, then author-beats — and until
// 2026-07-28 it was hand-written straight onto the element. That was not a shortcut: it was a
// state the loop could not reach at all (nextActionsForElement answered "draft-beats" for an
// image scrolly and draftBeats refused it), so this proof was rendering an artifact no run could
// have produced. A proof that constructs the state the loop cannot reach proves the wrong thing.
import { test, expect } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import "../../skills/splash/src/register-producers";
import { produce } from "./produce";
import { freezeInput } from "./freeze";
import { draftBeats, applyBeats } from "./beats";
import { nextActionsForElement } from "./manifest";
import { assembleImageNative } from "./assemble/image-native";
import { type ImageStory } from "../../skills/image-native/src/image-story";
import type { AuthoredBeat } from "../brain/verify-beats";
import type { ProductionBrief } from "../core/production-brief";
import type { RunManifest } from "./manifest";

const RUN_IT = process.env.SPLASH_IMAGE_E2E === "1";
const proof = RUN_IT ? test : test.skip;

// Three generated (not photographed — see lib/loop/fixtures's own header) solid-colour JPEGs,
// standing in for the journalist's own photographs.
const IMAGE_DIR = join(import.meta.dir, "fixtures");

// The journalist's own captions — deliberately prose an automatic derivation would not
// produce, so their presence on the rendered page is unambiguous evidence of the authored walk.
const CAPTIONS = [
  "The eastern bank stood quiet for a century before the works began.",
  "Machinery moved in and the embankment took shape within a season.",
  "A concrete channel now runs where the towpath used to be.",
];

const ALTS = [
  "A green riverbank photographed in solid colour, standing in for a field before construction.",
  "A tan-toned frame standing in for bare earth mid-construction.",
  "A grey-toned frame standing in for a finished concrete embankment.",
];

const FIXTURE_BRIEF: ProductionBrief = {
  elementId: "e1",
  nativeType: "image-scrolly",
  format: "scrolly",
  angle: {
    confirmedTakeaway: "The canal split the village in two",
    altInsight:
      "Three photographs tracing the waterway from field to concrete channel",
  },
  dataCsv: "",
  attribution: "Heidi.news",
  // establish → build → payoff. It said establish → TURN → payoff until 2026-07-28, and that
  // plan is one lib/brain/verify-beats.ts REFUSES: a three-beat arc has no room for a turn
  // (arcErrors needs at least one build between the two ends). The fixture could hold it only
  // because it was hand-written straight onto the element — see the header.
  beats: [
    { role: "establish", text: CAPTIONS[0]! },
    { role: "build", text: CAPTIONS[1]! },
    { role: "payoff", text: CAPTIONS[2]! },
  ],
  images: {
    dir: IMAGE_DIR,
    frames: [
      {
        frameRef: "canal-before.jpg",
        alt: ALTS[0]!,
        credit: { name: "M. Rossi / Heidi.news" },
      },
      {
        frameRef: "canal-during.jpg",
        alt: ALTS[1]!,
        credit: { name: "M. Rossi / Heidi.news" },
      },
      {
        frameRef: "canal-after.jpg",
        alt: ALTS[2]!,
        credit: { name: "M. Rossi / Heidi.news" },
      },
    ],
  },
};

/** The run every test here walks — no narrative on it, because the narrative is what the loop's
 *  own route produces. One fixture, so the always-on route test and the render proof cannot come
 *  to walk two different runs. */
function imageRunFixture(): { run: RunManifest; runDir: string } {
  const runDir = mkdtempSync(join(tmpdir(), "splash-image-e2e-"));
  const src = join(runDir, "data.csv");
  writeFileSync(src, "note\nno data axis for an image story\n");
  const run: RunManifest = {
    runId: "image-e2e",
    schemaVersion: 6,
    route: "article",
    channel: "article-web",
    input: {
      data: freezeInput(runDir, src, "data"),
      images: FIXTURE_BRIEF.images,
    },
    sources: {
      mode: "real",
      data: {
        kind: "public",
        label: "Heidi.news",
        url: "https://www.heidi.news/fr/annemasse-capitale-du-n-importe-quoi",
      },
    },
    orient: {
      profile: { columns: ["note"], numericColumns: [], rowCount: 1 },
      supportsPoint: false,
    },
    elements: [
      {
        id: "e1",
        // RunElement's own angle schema requires `unit` (unlike ProductionBrief's, where it
        // is optional) — "" is the same "no unit" this loop already renders for a chart
        // whose value has none; an image scrolly has no value axis at all.
        angle: { ...FIXTURE_BRIEF.angle, unit: "" },
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

/** The journalist's turn: the drafted plan's own ids and roles, with each claim written. */
function authoredWalk(el: { narrative?: { beats: { id: string }[] } }) {
  return el.narrative!.beats.map((b, i) => ({
    id: b.id,
    role: FIXTURE_BRIEF.beats![i]!.role,
    text: CAPTIONS[i]!,
  })) as AuthoredBeat[];
}

// ALWAYS ON — no browser, no subprocess, no render. This is what stops this proof rotting
// silently if the assembler or the engine's own rules drift apart, which is exactly how four
// earlier proofs came to be broken on main with nobody noticing (spec 2026-07-27-proofs-run §4).
//
// It used to hand the fixture to `checkImageConformance` and assert no violations — VACUOUS,
// measured: assembleImageNative runs that very check as its precondition for returning `ok`
// (image-native.ts), so the assertion reduced to `expect(r.ok).toBe(true)`. What the assembler
// does NOT guarantee is checked instead: that the story it composes carries the JOURNALIST'S
// captions in the journalist's order, one per photograph, each marked as authored — the zip that
// is this assembler's whole job, and the thing a silent off-by-one would break.
test("the assembler zips the declared photographs to the authored beats, in order", () => {
  const r = assembleImageNative(FIXTURE_BRIEF);
  expect(r.ok ? "assembled" : r.message).toBe("assembled");
  if (!r.ok) return;
  const story = r.value as ImageStory;
  expect(story.frames.map((f) => f.frameRef)).toEqual(
    FIXTURE_BRIEF.images!.frames.map((f) => f.frameRef),
  );
  expect(story.frames.map((f) => f.caption)).toEqual(CAPTIONS);
  expect(story.frames.map((f) => f.alt)).toEqual(ALTS);
  // Never "article": the caption IS the beat, so nothing was matched against a passage and the
  // engine's anti-copy tripwire must stay off rather than be handed a reference nobody wrote.
  expect(story.frames.every((f) => f.captionSource === "authored")).toBe(true);
  // No `turn` in this three-beat walk, so the representative frame is the first.
  expect(story.keyFrame).toBe(0);
});

// ALSO ALWAYS ON — THE ROUTE. The narrative used to be hand-written onto the element, which is a
// state the loop itself could not reach: `nextActionsForElement` answered "draft-beats" for an
// image scrolly and `draftBeats` refused it, so no run could ever have produced this artifact.
// A proof that constructs the state the loop cannot reach proves the wrong thing. This walks the
// loop's own steps instead — offer chosen → draft → author — and it is what the render proof
// below now stands on.
test("the loop's own route reaches an authored image walk: choose → draft-beats → author-beats", () => {
  const { run, runDir } = imageRunFixture();
  try {
    const el = run.elements[0]!;
    expect(el.narrative).toBeUndefined();
    expect(nextActionsForElement(run, el)).toEqual(["draft-beats"]);

    const drafted = draftBeats(run, el, runDir);
    expect(drafted.ok ? "drafted" : drafted.message).toBe("drafted");
    if (!drafted.ok) return;
    const withPlan: RunManifest = { ...run, elements: [drafted.value] };
    expect(nextActionsForElement(withPlan, drafted.value)).toEqual([
      "author-beats",
    ]);

    const ready = applyBeats(withPlan, "e1", authoredWalk(drafted.value));
    expect(nextActionsForElement(ready, ready.elements[0]!)).toEqual([
      "produce",
    ]);
    expect(ready.elements[0]!.narrative!.beats.map((b) => b.text)).toEqual(
      CAPTIONS,
    );
  } finally {
    rmSync(runDir, { recursive: true, force: true });
  }
});

// Reads the built page's narrative steps and photo alts straight out of the DOM. A scrolly
// paints its captions at runtime and the alt is the accessibility promise of this whole engine
// — only the rendered page can prove either shipped (beats-render-proof.test.ts's own lesson:
// grepping a single-file bundle is not evidence).
async function readRenderedFrames(
  pagePath: string,
): Promise<{ captions: string[]; alts: string[] }> {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch();
  try {
    const tab = await browser.newPage({
      viewport: { width: 1200, height: 900 },
    });
    await tab.goto(`file://${pagePath}`, { waitUntil: "networkidle" });
    await tab.waitForSelector("[data-step-index]", { timeout: 30_000 });
    const captions = await tab.$$eval("[data-step-index]", (nodes) =>
      nodes.map((n) => (n.textContent ?? "").replace(/\s+/g, " ").trim()),
    );
    const alts = await tab.$$eval("img", (nodes) =>
      nodes.map((n) => (n as HTMLImageElement).alt),
    );
    return { captions, alts };
  } finally {
    await browser.close();
  }
}

proof(
  "a declared photograph sequence produces a real scrolly, captions and alts read off the rendered DOM",
  async () => {
    const { run, runDir } = imageRunFixture();
    try {
      // THE ROUTE, not a hand-written narrative: draft the walk the way the loop does, then
      // author it. What is rendered below is therefore reachable from a real run.
      const drafted = draftBeats(run, run.elements[0]!, runDir);
      expect(drafted.ok ? "drafted" : drafted.message).toBe("drafted");
      if (!drafted.ok) return;
      const ready = applyBeats(
        { ...run, elements: [drafted.value] },
        "e1",
        authoredWalk(drafted.value),
      );

      const result = await produce(ready, ready.elements[0]!, runDir);
      expect(result.ok ? "produced" : `${result.code}: ${result.message}`).toBe(
        "produced",
      );
      if (!result.ok) return;

      const page = join(runDir, fileArtifact(result.value.artifact)!.path);
      const { captions, alts } = await readRenderedFrames(page);
      const walk = captions.join(" • ");
      for (const caption of CAPTIONS) expect(walk).toContain(caption);
      for (const alt of ALTS) expect(alts).toContain(alt);
      // The alt is not a restatement of the caption — WCAG 1.1.1, and the engine's own
      // conformance already fails hard on a duplicate; this is the DOM's confirmation of it.
      for (const alt of ALTS)
        expect(captions.some((c) => c === alt)).toBe(false);
    } finally {
      rmSync(runDir, { recursive: true, force: true });
    }
  },
  180_000,
);
