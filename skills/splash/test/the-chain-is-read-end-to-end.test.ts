/**
 * L1 → L6 — THE CHAIN IS READ BY BEING CALLED, AND EVERY SCAFFOLD IS JOINED TO IT.
 *
 * The drift this exists to catch is the one that let the catalogue and the web export diverge: a
 * link stops being read, nothing goes red, and the chain degrades quietly into six steps that each
 * infer what they need. So this file does two things.
 *
 * ONE — IT CALLS THE WHOLE CHAIN, on a fixture story built in a temp directory, in order:
 *
 *   readRetained        the journalist's choice, off a real `STORYBOARD.md`
 *   readRunDirection    the run's one art direction, off a real `DIRECTION.md`
 *   requiredAssertions  what the grounding, the claim shape, the sheet and the format require
 *   choreographyFrame   the shape, the vocabulary, the prohibitions, what the proposal constrains
 *   parseChoreography   the beat's own declaration
 *   checkChoreography   whether it honours the frame
 *
 * Importing them would prove nothing: a module can import a function and never call it, which is
 * exactly what the six steps were doing to the retained proposal before this work. Each one here
 * is CALLED, and its output is fed to the next.
 *
 * TWO — EVERY ONE OF THE EIGHT SCAFFOLDS IMPORTS THE FRAME AND ITS OWN CHECKER PAIR, and writes an
 * EMPTY section. A scaffold that pre-filled a row would be the clone factory R-D forbids, so the
 * emptiness is asserted, not trusted: a freshly rendered section has zero table rows and no
 * `splash:` block.
 *
 * WHERE THE PLAN COULD NOT BE FOLLOWED, AND WHY. It asks each scaffold to "resolve the retained
 * slot and refuse on it being missing". A scaffold cannot: `parseStoryboard` lives in
 * `skills/storyboard/scripts/gate-contract.mjs`, and no file inside a craft skill may import out
 * of its own directory (`no-cross-skill-imports.test.ts`). The retained slot is the ORCHESTRATOR's
 * refusal — `splash` already holds `REQUIRED_SLOT_FIELDS`, which `interaction` joined in task 4 —
 * and the scaffolds hold the refusal they can make on their own: the run's `DIRECTION.md`, in the
 * `paletteReachable` / `paletteRefusalMessage` shape, with `--filed` as the catalogue-only escape.
 *
 * MUTATIONS RUN (2026-09-17, task 13)
 *   - replaced the `choreographyFrame` import in `skills/chart-web/scripts/scaffold-web-beat.mjs`
 *     with a local stub → RED on "should read its own type sheet into a real frame" and on
 *     "should write a section with no rows in it and no block", both naming web / chart.
 *     Restored → green.
 *   - made `renderChoreographySection` emit one pre-filled table row → RED on "should write a
 *     section with no rows in it and no block". Restored → green.
 *   - made `assertRunDirection` return instead of throwing → RED on "should refuse a beat with no
 *     run direction reachable". Restored → green.
 */
import { describe, expect, it } from "bun:test";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
// @ts-expect-error — the trunk is ESM JavaScript.
import { readRetained } from "../../../shared/editorial/retained.mjs";
// @ts-expect-error — as above.
import {
  choreographyFrame,
  parseTypeSheet,
  requiredAssertions,
} from "../../../shared/editorial/frame.mjs";
// @ts-expect-error — as above.
import {
  composeRunDirection,
  readRunDirection,
  writeRunDirection,
} from "../../../shared/design-base/run-direction.mjs";
// @ts-expect-error — as above.
import { filedDirections } from "../../../shared/design-base/index.mjs";
// @ts-expect-error — the scrolly pair, called on a real declaration.
import {
  parseChoreography,
  checkChoreography,
} from "../../scrolly/scripts/choreography.mjs";
// @ts-expect-error — storyboard's own parser, injected the way `readRetained` requires.
import { parseStoryboard } from "../../storyboard/scripts/gate-contract.mjs";
// @ts-expect-error — the eight scaffolds, one per (medium, format) a beat can be produced in.
import * as scrollyChart from "../../scrolly/scripts/scaffold-scrolly-beat.mjs";
// @ts-expect-error — as above.
import * as scrollyMap from "../../scrolly/scripts/scaffold-scrolly-map-beat.mjs";
// @ts-expect-error — as above.
import * as videoChart from "../../chart-video/scripts/scaffold-video-beat.mjs";
// @ts-expect-error — as above.
import * as videoMap from "../../map-beat/scripts/scaffold-map-video-beat.mjs";
// @ts-expect-error — as above.
import * as webChart from "../../chart-web/scripts/scaffold-web-beat.mjs";
// @ts-expect-error — as above.
import * as webMap from "../../map-web/scripts/scaffold-web-map-beat.mjs";
// @ts-expect-error — as above.
import * as staticChart from "../../chart-beat/scripts/scaffold-static-beat.mjs";
// @ts-expect-error — as above.
import * as staticMap from "../../map-beat/scripts/scaffold-static-map-beat.mjs";

const ROOT = resolve(import.meta.dirname, "..", "..", "..");

const SCAFFOLDS: Array<{
  name: string;
  path: string;
  module: Record<string, unknown>;
  type: string;
}> = [
  {
    name: "scrolly / chart",
    path: "skills/scrolly/scripts/scaffold-scrolly-beat.mjs",
    module: scrollyChart,
    type: "bar-and-column",
  },
  {
    name: "scrolly / map",
    path: "skills/scrolly/scripts/scaffold-scrolly-map-beat.mjs",
    module: scrollyMap,
    type: "choropleth",
  },
  {
    name: "video / chart",
    path: "skills/chart-video/scripts/scaffold-video-beat.mjs",
    module: videoChart,
    type: "bar-and-column",
  },
  {
    name: "video / map",
    path: "skills/map-beat/scripts/scaffold-map-video-beat.mjs",
    module: videoMap,
    type: "choropleth",
  },
  {
    name: "web / chart",
    path: "skills/chart-web/scripts/scaffold-web-beat.mjs",
    module: webChart,
    type: "bar-and-column",
  },
  {
    name: "web / map",
    path: "skills/map-web/scripts/scaffold-web-map-beat.mjs",
    module: webMap,
    type: "choropleth",
  },
  {
    name: "static / chart",
    path: "skills/chart-beat/scripts/scaffold-static-beat.mjs",
    module: staticChart,
    type: "bar-and-column",
  },
  {
    name: "static / map",
    path: "skills/map-beat/scripts/scaffold-static-map-beat.mjs",
    module: staticMap,
    type: "choropleth",
  },
];

const STORYBOARD = [
  "---",
  'takeaway: "China emitted more than the next five put together."',
  "language: en",
  'grounding: "supported"',
  "claimShape: comparison",
  "slots:",
  "  - id: 1",
  '    proves: "the claim"',
  '    medium: "chart"',
  '    format: "scrolly"',
  "    size: landscape",
  "    intent: rank",
  "    interaction: scroll",
  '    chosen: "Bar and column"',
  "---",
  "",
].join("\n");

function fixtureStory(): string {
  const story = mkdtempSync(join(tmpdir(), "editorial-chain-"));
  writeFileSync(join(story, "STORYBOARD.md"), STORYBOARD);
  const { chosen } = composeRunDirection({
    newsroom: { ground: "#FFFCEE", accent: "#1757B6", origin: "newsroom" },
    filed: filedDirections(),
    subject: "the ten largest emitters of 2024",
  });
  writeRunDirection(story, chosen);
  mkdirSync(join(story, "beats", "1-emissions"), { recursive: true });
  return story;
}

describe("the chain is read end to end, by being called", () => {
  it("should carry one retained proposal through every link, each step calling the last", () => {
    const story = fixtureStory();
    const beatDir = join(story, "beats", "1-emissions");

    const retained = readRetained(story, "1", { parseStoryboard });
    expect(retained.format).toBe("scrolly");
    expect(retained.claim.grounding).toBe("supported");
    expect(retained.interaction.kind).toBe("scroll");

    const direction = readRunDirection(beatDir, { stopAt: story });
    expect(direction.origin).toContain("the ten largest emitters of 2024");

    const sheet = parseTypeSheet(
      readFileSync(
        join(ROOT, "skills/scrolly/references/types/bar-and-column.md"),
        "utf8",
      ),
    );

    const required = requiredAssertions(retained, sheet);
    expect(required.map((r: { id: string }) => r.id)).toEqual(
      expect.arrayContaining([
        "claim-datum",
        "comparison-left",
        "comparison-right",
        "asserted-per-card",
      ]),
    );

    const frame = choreographyFrame(retained, sheet);
    expect(frame.shape).toBe("scroll");
    expect(frame.constrains.interactionKind).toBe("scroll");
    expect(frame.prohibitions.length).toBeGreaterThan(1);

    const declared = parseChoreography(
      readFileSync(
        join(ROOT, "proof/scrolly-bar-top-emitters-2024/BRIEF.md"),
        "utf8",
      ),
      {
        // The beat's own six cards, as six states that differ: `note` counts the cards (and is
        // therefore excluded from `changes` by construction) and `spread` is what moves.
        states: [0, 1, 2, 3, 4, 5].map((note) => ({ note, spread: note * 2 })),
      },
    );
    expect(declared.kind).toBe("scroll");

    expect(
      checkChoreography(declared, frame).filter(
        (v: { severity: string }) => v.severity === "violation",
      ),
    ).toEqual([]);
  });

  it.each(SCAFFOLDS)(
    "should join every scaffold to the frame and to its own checker pair — $name",
    ({ path, module }) => {
      const source = readFileSync(join(ROOT, path), "utf8");
      expect(source, path).toContain("choreographyFrame");
      expect(source, path).toContain("scaffoldRequirements");
      expect(typeof module.chainFrameFor, path).toBe("function");
      expect(typeof module.withChainSections, path).toBe("function");
      expect(typeof module.assertRunDirection, path).toBe("function");
      // The checker pair, reachable THROUGH the scaffold — an import a renamed export breaks.
      expect(typeof module.checkChoreography, path).toBe("function");
      expect(typeof module.checkPrecision, path).toBe("function");
    },
  );

  it.each(SCAFFOLDS)(
    "should read its own type sheet into a real frame, with no choreography in it — $name",
    ({ module, type, name }) => {
      const { frame } = (
        module.chainFrameFor as (t: string) => {
          frame: Record<string, unknown>;
        }
      )(type);
      expect(frame.vocabulary, name).not.toHaveLength(0);
      expect(frame.prohibitions, name).not.toHaveLength(0);
      for (const key of ["cards", "shots", "stations", "controls", "rows"])
        expect(
          Object.keys(frame),
          `${name} — the frame supplies no ${key}`,
        ).not.toContain(key);
    },
  );

  it.each(SCAFFOLDS)(
    "should write a section with no rows in it and no block — $name",
    ({ module, type, name }) => {
      const brief =
        "---\nformat: x\n---\n\n# Beat\n\n## The choreography\n\n## Precision\n";
      const out = (
        module.withChainSections as (b: string, t: string) => string
      )(brief, type);
      expect(out, name).not.toContain("```json splash:");
      // A row is a `|` line that is neither the header nor its rule. There must be none.
      const rows = out
        .split("\n")
        .filter(
          (line) =>
            line.trim().startsWith("|") && !/^\|[\s:-]+\|/.test(line.trim()),
        );
      expect(rows.length, `${name} — ${rows.join(" / ")}`).toBeLessThanOrEqual(
        1,
      );
      expect(out, name).toContain("a choreography of this type must NOT");
    },
  );

  it.each(SCAFFOLDS)(
    "should refuse a beat with no run direction reachable, and let --filed through — $name",
    ({ module, name }) => {
      const bare = mkdtempSync(join(tmpdir(), "no-direction-"));
      const assertRunDirection = module.assertRunDirection as (
        root: string,
        dir: string,
        filed: boolean,
      ) => void;
      expect(() => assertRunDirection(bare, bare, false), name).toThrow(
        /DIRECTION\.md/,
      );
      expect(() => assertRunDirection(bare, bare, true), name).not.toThrow();
    },
  );
});
