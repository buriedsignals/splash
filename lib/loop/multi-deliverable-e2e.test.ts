// The proof that a run really carries several deliverables — through the real engines, to real
// files on disk, at three different pixel geometries, from ONE confirmed takeaway.
//
// OPT-IN (SPLASH_E2E_DELIVERABLES=1): it drives three complete chart-native builds. That is
// minutes, a browser and a bundler — too much for every `bun test`, and worth exactly nothing if
// it were faked, which is why it is a real run rather than a mocked one. Same discipline as
// lib/loop/video-e2e.test.ts and lib/verify/real-artifact-proof.test.ts.
//
// What it actually proves, and unit tests cannot: that a print deliverable RENDERS — that a
// 2480x1748 box is a size the static path can produce, not just a number in a policy table.
import { test, expect } from "bun:test";
import { mkdtempSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import "../../skills/splash/src/register-producers";
import { advanceStep } from "./driver";
import { chooseForm } from "./choose";
import { applyPhrasing } from "./phrase";
import {
  planDeliverables,
  confirmAspect,
  deliverablePlan,
} from "./deliverables";
import {
  nextActions,
  liveElementFor,
  resolvedChannelForElement,
  writeManifest,
  type NextAction,
  type RunManifest,
} from "./manifest";
import { CHANNEL_POLICY } from "../core/channel-policy";
import { freezeInput } from "./freeze";
import { tryLoadDecor } from "../newsroom/decor";
import { validateSourcePolicy } from "../source/policy";

const RUN = process.env.SPLASH_E2E_DELIVERABLES === "1";

/** The IHDR box of a PNG — width and height, straight out of the file. */
function pngSize(path: string): { width: number; height: number } {
  const buf = readFileSync(path);
  expect(buf.subarray(1, 4).toString("ascii")).toBe("PNG");
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function seedRun(runDir: string): RunManifest {
  const src = join(runDir, "src.csv");
  // Deliberately NOT geographic: a column of canton names makes the brain rank map forms to
  // the top, and map-native is not one of the engines the loop builds through yet — the run
  // would dead-end on the offer rather than on anything this test is about.
  writeFileSync(
    src,
    "sector,2015,2024\nHousing,449,583\nTransport,412,531\nFood,289,352\nHealth,398,502",
  );
  return {
    runId: "deliverables-e2e",
    schemaVersion: 4,
    route: "embed",
    channel: "article-web",
    input: { data: freezeInput(runDir, src, "data") },
    // The CSV written just above is a `local` source. produce() refuses an undeclared run
    // ("the class of a source is declared, never guessed") and renders the declared credit
    // into every one of the three geometries this proof measures.
    sources: {
      mode: "real" as const,
      data: { kind: "local" as const, label: "Relevés cantonaux 2024" },
    },
    elements: [
      {
        id: "e1",
        angle: {
          confirmedTakeaway: "Household costs rose in every sector shown",
          altInsight:
            "Between 2015 and 2024 the monthly household cost rose in all four sectors shown; housing stays the largest.",
          unit: "Monthly household cost (CHF)",
          emphasis: "Housing",
        },
      },
    ],
    events: [],
  };
}

/**
 * Every action the loop can route to, and who answers it in the walk below. A Record over the
 * NextAction UNION, so adding a step to lib/loop/manifest.ts breaks THIS FILE's `tsc --noEmit` —
 * which runs on every `bun run check`, with no browser and no bundler.
 *
 * That is the cheap guard `phrase` slipped past. When the phrasing seam landed, this walk kept
 * calling advanceStep on a human turn advanceStep does not answer, spun its 40 iterations doing
 * nothing, and the proof failed weeks later on `["phrase"] !== ["show"]`. Nothing about that
 * needed an engine to notice.
 */
type Answerer = "answered-here" | "advance" | "terminal" | "unreachable";
const ANSWERED_BY: Record<NextAction, Answerer> = {
  orient: "advance",
  propose: "advance",
  produce: "advance",
  capture: "advance",
  review: "advance",
  preview: "advance",
  deliver: "advance",
  phrase: "answered-here",
  "choose-form": "answered-here",
  "confirm-aspect": "answered-here",
  show: "terminal",
  // Not reachable for THIS fixture: the seed confirms its angle up front, asks for no article
  // branch, and requests no delivery. The walk says so out loud rather than spinning, so a
  // routing change lands as a sentence naming the step instead of as a silent stall.
  "confirm-angle": "unreachable",
  "draft-beats": "unreachable",
  "author-beats": "unreachable",
  approve: "unreachable",
};

// ALWAYS ON — the millisecond half of this proof, deliberately outside the gate. Everything it
// asserts is decidable from the fixture alone, and it is the only part of this file that
// `bun run check` ever runs.
test("the fixture declares a source the loop will accept, before any render", () => {
  const seed = seedRun(
    mkdtempSync(join(tmpdir(), "loop-deliverables-fixture-")),
  );
  // produce() refuses an undeclared run, and under the gate that refusal costs a full setup to
  // reach. This is the same verdict, from the same policy module, in milliseconds.
  const verdict = validateSourcePolicy(seed.sources?.data, {
    mode: seed.sources?.mode,
  });
  expect(verdict.ok ? "accepted" : `${verdict.code}: ${verdict.message}`).toBe(
    "accepted",
  );
});

test.skipIf(!RUN)(
  "one takeaway, three deliverables — web, social and print, each rendered at its own geometry",
  async () => {
    const runDir = mkdtempSync(join(tmpdir(), "loop-deliverables-e2e-"));
    const seed = seedRun(runDir);

    // STAGE 1 — the multi-select. Static everywhere so the three deliverables differ by
    // GEOMETRY alone: that is what makes the pixel assertions below evidence about the
    // destination rather than about the format.
    const planned = planDeliverables(seed, [
      { destination: "article-web", requestedFormat: "static" },
      { destination: "social", requestedFormat: "static" },
      { destination: "print", requestedFormat: "static" },
    ]);
    if (!planned.ok) throw new Error(planned.message);
    let run = planned.value;
    expect(run.elements).toHaveLength(3);

    const decor = tryLoadDecor();
    // Drive it exactly as a host would: ask what is valid, run it, answer the human turns.
    for (let i = 0; i < 40; i++) {
      const [next] = nextActions(run);
      if (!next) break;
      const answerer = ANSWERED_BY[next];
      if (answerer === "terminal") break;
      // The runtime half of the table above: a step this walk does not answer stops the proof
      // with the step's NAME, instead of letting the loop idle to its iteration cap and fail
      // forty steps later on an unrelated assertion.
      if (answerer === "unreachable")
        throw new Error(
          `the loop routed this run to "${next}", which this walk does not answer — the loop changed under the fixture`,
        );
      const live = liveElementFor(run);
      if (!live) throw new Error("no live element");
      const replace = (el: typeof live) => ({
        ...run,
        elements: run.elements.map((e) => (e.id === live.id ? el : e)),
      });

      if (next === "confirm-aspect") {
        // STAGE 3 — asked here and nowhere earlier: the form is already chosen.
        const r = confirmAspect(live, "portrait");
        if (!r.ok) throw new Error(r.message);
        run = replace(r.value);
        continue;
      }
      if (next === "phrase") {
        // The phrasing seam: propose() leaves every `why` empty on purpose (the brain hands over
        // grounding, the desk writes the language), and an offer nobody phrased may not be
        // chosen from. A host does this with a model; here it is one fixed sentence per option,
        // through the same guarded writer — applyPhrasing, not a hand-written `why`, so this
        // fixture cannot drift past verifyOffer the way it drifted past this whole step.
        //
        // The sentence carries NO DIGIT deliberately: verifyOffer grounds every number in the
        // prose against the option's own computed facts, and a test string inventing one would
        // be refused — correctly.
        run = applyPhrasing(
          run,
          live.id,
          (live.proposal?.options ?? []).map((o) => ({
            id: o.id,
            why: "the desk's own words for this option",
            // Structural, not textual: a marked option must have its mark acknowledged, an
            // unmarked one must not.
            ...(o.readiness ? { markAcknowledged: true as const } : {}),
          })),
        );
        continue;
      }
      if (next === "choose-form") {
        const options = live.proposal?.options ?? [];
        let chosen: RunManifest | undefined;
        for (const o of options) {
          const r = chooseForm(live, o.id);
          if (r.ok) {
            chosen = replace(r.value);
            break;
          }
        }
        if (!chosen)
          throw new Error(
            `no buildable option for ${live.id}: ${options.map((o) => o.id).join(", ")}`,
          );
        run = chosen;
        continue;
      }
      const outcome = await advanceStep(run, runDir, decor);
      if (outcome.failure)
        throw new Error(
          `${outcome.failure.action} refused on ${live.id}: ${outcome.failure.message}`,
        );
      run = outcome.run;
    }

    // The run only says "show" once EVERY deliverable is there — the acceptance criterion.
    expect(nextActions(run)).toEqual(["show"]);

    const rows = deliverablePlan(run);
    expect(rows.map((r) => r.destination)).toEqual([
      "article-web",
      "social",
      "print",
    ]);

    const measured: Record<string, { width: number; height: number }> = {};
    for (const el of run.elements) {
      expect(el.artifact).toBeDefined();
      const abs = join(runDir, el.artifact!.path);
      expect(existsSync(abs)).toBe(true);
      const channel = resolvedChannelForElement(run, el)!;
      const size = pngSize(abs);
      measured[channel] = size;
      const expected = CHANNEL_POLICY[channel].mediaSize;
      // The same +/-2px the shared assertRenderedSize allows (an odd channel height rounds
      // through a halved CSS box).
      expect(Math.abs(size.width - expected.width)).toBeLessThanOrEqual(2);
      expect(Math.abs(size.height - expected.height)).toBeLessThanOrEqual(2);
    }
    // Three destinations, three geometries — never one artifact reused for all of them.
    expect(
      new Set(Object.values(measured).map((s) => `${s.width}x${s.height}`))
        .size,
    ).toBe(3);

    // ...and every one of them carries the SAME confirmed takeaway.
    expect(
      new Set(run.elements.map((el) => el.angle!.confirmedTakeaway)).size,
    ).toBe(1);

    // The manifest of all this survives its own invariants.
    writeManifest(join(runDir, "run.json"), run);
    console.log(
      `[deliverables-e2e] ${runDir}\n` +
        run.elements
          .map(
            (el) =>
              `  ${el.id}: ${el.deliverable!.destination} → ${resolvedChannelForElement(run, el)} ` +
              `${JSON.stringify(measured[resolvedChannelForElement(run, el)!])} ${el.artifact!.path}`,
          )
          .join("\n"),
    );
  },
  20 * 60 * 1000,
);
