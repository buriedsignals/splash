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
  type RunManifest,
} from "./manifest";
import { CHANNEL_POLICY } from "../core/channel-policy";
import { freezeInput } from "./freeze";
import { tryLoadDecor } from "../newsroom/decor";

const RUN = process.env.SPLASH_E2E_DELIVERABLES === "1";

/** The IHDR box of a PNG — width and height, straight out of the file. */
function pngSize(path: string): { width: number; height: number } {
  const buf = readFileSync(path);
  expect(buf.subarray(1, 4).toString("ascii")).toBe("PNG");
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

test.skipIf(!RUN)(
  "one takeaway, three deliverables — web, social and print, each rendered at its own geometry",
  async () => {
    const runDir = mkdtempSync(join(tmpdir(), "loop-deliverables-e2e-"));
    const src = join(runDir, "src.csv");
    // Deliberately NOT geographic: a column of canton names makes the brain rank map forms to
    // the top, and map-native is not one of the engines the loop builds through yet — the run
    // would dead-end on the offer rather than on anything this test is about.
    writeFileSync(
      src,
      "sector,2015,2024\nHousing,449,583\nTransport,412,531\nFood,289,352\nHealth,398,502",
    );

    const seed: RunManifest = {
      runId: "deliverables-e2e",
      schemaVersion: 4,
      route: "embed",
      channel: "article-web",
      input: { data: freezeInput(runDir, src, "data") },
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
      if (!next || next === "show") break;
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
