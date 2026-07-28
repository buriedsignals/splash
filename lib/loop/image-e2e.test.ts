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
import { test, expect } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import "../../skills/splash/src/register-producers";
import { produce } from "./produce";
import { freezeInput } from "./freeze";
import { assembleImageNative } from "./assemble/image-native";
import {
  checkImageConformance,
  type ImageStory,
} from "../../skills/image-native/src/image-story";
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
  beats: [
    { role: "establish", text: CAPTIONS[0]! },
    { role: "turn", text: CAPTIONS[1]! },
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

// ALWAYS ON — the fixture handed to the ENGINE'S OWN conformance check, no browser, no
// subprocess, no render. This is what stops this proof rotting silently if the assembler or the
// engine's own rules drift apart, which is exactly how four earlier proofs came to be broken on
// main with nobody noticing (spec 2026-07-27-proofs-run §4).
test("the fixture assembles into a story the engine's own conformance accepts, before any render", () => {
  const r = assembleImageNative(FIXTURE_BRIEF);
  expect(
    r.ok
      ? checkImageConformance(r.value as ImageStory, { format: "scrolly" })
      : [r.message],
  ).toEqual([]);
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
    const runDir = mkdtempSync(join(tmpdir(), "splash-image-e2e-"));
    try {
      const src = join(runDir, "data.csv");
      writeFileSync(src, "note\nno data axis for an image story\n");

      const run: RunManifest = {
        runId: "image-e2e",
        schemaVersion: 4,
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
            narrative: {
              beats: FIXTURE_BRIEF.beats!.map((b, i) => ({
                id: `b${i}`,
                anchor: { kind: "category" as const, value: `frame-${i}` },
                role: b.role,
                text: b.text,
                draftText: "",
                beatSource: { facts: {}, shared: {} },
              })),
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

      const el = run.elements[0]!;
      const result = await produce(run, el, runDir);
      expect(result.ok ? "produced" : `${result.code}: ${result.message}`).toBe(
        "produced",
      );
      if (!result.ok) return;

      const page = join(runDir, result.value.artifact!.path);
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
