/**
 * A DE-COLLISION DECISION TAKEN IN THE WRONG COORDINATE SYSTEM.
 *
 * This genre's second build made geometry stretch continuously while type stays a fixed CSS pixel
 * size. That left every *de-collision* decision — which axis label survives, which side a caption
 * takes — computed ONCE, server-side, at ONE width. And the width chosen was the narrowest, so a
 * label dropped to save a 205px phone plot was dropped on a 3265px ultrawide one too.
 *
 * The owner reported it by opening the file: `webz-bump-emitter-rank`'s x axis read
 * `1990 1995 2000 2005 2010 2015 2024` at every width, with 2020 simply absent. Measured before the
 * fix: at 1600 the 2015→2024 gap was 311px between label centres where every other gap was 173px;
 * at 3440 it was 797px against 431px. The rule the component applied was right. The number it
 * applied it to was a constant.
 *
 * WHAT THIS GUARD ASSERTS, and it is deliberately one narrow thing. For every delivered `.html`,
 * driven at two real widths: **the drawn x-axis labels must not leave a member of their own
 * arithmetic run missing in a gap that has room for it.** The beat's own step is read from the
 * labels the page actually drew — the modal difference between neighbouring values — so this guard
 * knows nothing about what the beat *could* have printed and needs no font metrics beyond the boxes
 * the labels themselves report. If the drawn run is 1990, 1995, …, 2015, 2024, then 2020 is a member
 * of that run, it is missing, and the 311px hole is wide enough for it: red.
 *
 * WHY THE ROOM TEST IS HALF THE RULE. At 375 the same beat legitimately prints
 * `1990 2000 2010 2024`: 1995 is a member of the run and it is missing, and the gap it would sit in
 * is 30px against a 27px label — no room. A guard without the room test would demand a label that
 * cannot fit and would be wrong about a correct artifact at exactly the width the genre is hardest
 * at. The room a member needs is measured from the widest label the page itself drew, plus the same
 * air a reader needs to read two numbers as two numbers.
 *
 * WHAT IT PROVABLY DOES NOT CATCH — read this before trusting it wider.
 *   1. ONLY THE X AXIS, and only labels carrying `.axis-label.x`. A y axis thinned by the same
 *      mistake, a caption parked on the wrong side, a peak label pushed into a corner because the
 *      narrow rung had no room beside it: none of that is reachable from here. The general form —
 *      "a decision was taken at the wrong width" — is not guardable, and a guard that claimed to be
 *      general would be the green guard that proves nothing.
 *   2. TWO WIDTHS, 375 and 1600. A decision that is right at both and wrong at 768 or 3440 passes.
 *   3. NON-NUMERIC AXES ARE SKIPPED, announced rather than silently omitted: a categorical axis has
 *      no arithmetic run, so there is no missing member to name. An artifact with fewer than four
 *      numeric x labels is skipped for the same reason — three points do not establish a step.
 *   4. IT CANNOT SEE A LABEL THAT WAS NEVER A CANDIDATE. If a beat's axis was authored as
 *      "every decade" and a decade is genuinely absent from the data, this reads it as a hole. No
 *      such beat exists in the corpus today; the report below lists every axis it read, so a new
 *      one is visible to a person rather than silently failing.
 *
 * THE MUTATION THAT REDDENS IT, run in a copy of the tree under `/tmp/fluid-mut/`, never here.
 * `BumpWeb.tsx`'s tick plan was reverted to the pre-fix rule — the one decision taken at
 * `narrowestPlotPx` and shipped to every width — and the beat re-rendered in the copy:
 *
 *   0 pass · 1 fail
 *   Received: "proof/webz-bump-emitter-rank/bump-emitter-rank.html @ 1600: the drawn x axis
 *   1990 1995 2000 2005 2010 2015 2024 steps by 5, and 2020 is a member of that run the page does
 *   not draw. Placed between 2015 and 2024 at its own position it would clear its neighbours by
 *   160px against the 33px a label needs — the decision that dropped it was taken at a width this
 *   is not"
 *
 * And the second direction, because a guard that only ever goes red one way is half-measured: at
 * 375 the SAME mutated file stays GREEN (the four-label axis it prints there has no room for its
 * missing members), and the corpus's other 23 artifacts stay green at both widths under the
 * mutation — the run reports exactly one failure line. So the red is attributable to the beat that
 * was broken, at the width it was broken at.
 *
 * THE FALSE POSITIVE THAT SHAPED THIS FILE, since one is worth more than the rules it produced.
 * The first draft asked whether the empty GAP was wide enough to hold the missing labels. It came
 * back red on the FIXED bump beat at 375, demanding 2020 inside a 54px gap. It was wrong: a tick
 * does not go in a gap, it goes at its own value's position, and 2020's position there sits 23px
 * from 2024's. See `holesIn` for the correction — room is measured at the member's own interpolated
 * position, never anywhere in the gap.
 */
import { describe, it, expect, setDefaultTimeout } from "bun:test";
import { existsSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, relative, resolve } from "node:path";
import puppeteer from "puppeteer";

const TWIN = resolve(import.meta.dirname, "../../..");
const PROOF = join(TWIN, "proof");

// A cold Chrome launch plus two drives of every delivered artifact is past bun:test's 5s default.
setDefaultTimeout(600000);

/** The two widths this guard retakes every decision at. Two, not seven — see blind spot 2. 1600 is
 *  where the reported hole measured 311px; 375 is the width the dropped decision was taken at, and
 *  it is here so the guard is proven not to demand a label that cannot fit. */
const WIDTHS = [
  { w: 1600, h: 800, label: "laptop-wide" },
  { w: 375, h: 812, label: "phone" },
];

/** The air two neighbouring axis labels need between their boxes to read as two numbers. The same
 *  6px the bump beat's own tick plan spends, named once here so this guard and that component are
 *  not two different opinions about the same gap. */
const LABEL_AIR_PX = 6;

/** A DUPLICATE of the `resolveChrome` every browser-driving file in this tree carries — duplicated,
 *  not imported, for the reason `map-web/test/standalone.test.ts`'s own copy states. */
function resolveChrome(): string {
  const candidates: string[] = [];
  if (process.env.CHROME_PATH) candidates.push(process.env.CHROME_PATH);
  const cache = join(homedir(), ".cache/puppeteer/chrome");
  if (existsSync(cache))
    for (const build of readdirSync(cache).sort().reverse())
      candidates.push(
        join(
          cache,
          build,
          "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
        ),
        join(
          cache,
          build,
          "chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
        ),
        join(cache, build, "chrome-linux64/chrome"),
      );
  candidates.push(
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  );
  const found = candidates.find((path) => existsSync(path));
  if (!found)
    throw new Error(
      `no Chrome to drive with. Looked in:\n  ${candidates.join("\n  ")}`,
    );
  return found;
}

function deliveredHtml(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) deliveredHtml(path, out);
    else if (entry.endsWith(".html")) out.push(path);
  }
  return out.sort();
}

type Tick = { value: number; left: number; right: number; text: string };

/** Reads the VISIBLE x-axis labels in drawn order. Visibility is read from the computed style, not
 *  from the markup: this is the whole point — a tick hidden by a container query is a tick the
 *  reader does not have, and a tick present in the DOM but displayed is one they do. */
const READ_X_AXIS = `(() => {
  const seen = [];
  for (const el of document.querySelectorAll(".axis-label.x")) {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) < 0.05) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0) continue;
    seen.push({ text: (el.textContent || "").trim(), left: r.left, right: r.right });
  }
  return seen.sort((a, b) => a.left - b.left);
})()`;

/** A label's text as a number, or `null`. Deliberately strict: a thin space or a unit means this is
 *  not a plain arithmetic run and the artifact is skipped rather than guessed at. */
function asNumber(text: string): number | null {
  if (!/^-?\d+(\.\d+)?$/.test(text)) return null;
  return Number(text);
}

/** The modal difference between neighbouring values — the beat's OWN step, read from what it drew.
 *  Ties go to the smallest, which is the conservative direction: a smaller step names more missing
 *  members, and every one of them still has to pass the room test before anything fails. */
function modalStep(values: number[]): number {
  const counts = new Map<number, number>();
  for (let i = 1; i < values.length; i++) {
    const d = Math.round((values[i] - values[i - 1]) * 1000) / 1000;
    if (d <= 0) return 0;
    counts.set(d, (counts.get(d) ?? 0) + 1);
  }
  let best = 0;
  let bestCount = 0;
  for (const [d, n] of [...counts.entries()].sort((a, b) => a[0] - b[0]))
    if (n > bestCount) {
      best = d;
      bestCount = n;
    }
  return bestCount >= 2 ? best : 0;
}

type Hole = {
  after: number;
  before: number;
  missing: number[];
  /** The tightest clearance the placed members actually have, in CSS pixels, centre to centre. */
  clearancePx: number;
  needPx: number;
};

/**
 * Every member of the run the page left out of a spot it had room for — AT THAT MEMBER'S OWN
 * POSITION, never anywhere in the gap.
 *
 * The distinction is the whole correctness of this guard, and it was found by the guard's first
 * draft being wrong about a correct artifact. That draft asked whether the empty gap was wide
 * enough to hold the missing labels, and on the bump beat at 375 it demanded 2020 in a 54px gap.
 * A tick does not go in a gap: it goes at its own value's position, and 2020's position on that
 * axis sits 23px from 2024's — the two would print as one number. An axis label's room is measured
 * from where the label would actually be, which is a linear interpolation between the two drawn
 * neighbours, since a member of an arithmetic run is at an arithmetic position.
 *
 * Members are placed left to right, each accepted only if it clears the last accepted mark and the
 * gap's own right-hand neighbour. So a gap with room for one of three missing members reports that
 * one, and a gap with room for none reports nothing at all.
 */
function holesIn(ticks: Tick[], step: number): Hole[] {
  const widest = Math.max(...ticks.map((t) => t.right - t.left));
  const need = widest + LABEL_AIR_PX;
  const centre = (t: Tick) => (t.left + t.right) / 2;
  const holes: Hole[] = [];
  for (let i = 1; i < ticks.length; i++) {
    const a = ticks[i - 1];
    const b = ticks[i];
    const members: number[] = [];
    for (
      let v = a.value + step;
      v < b.value - step * 0.01;
      v = Math.round((v + step) * 1000) / 1000
    )
      members.push(v);
    if (members.length === 0) continue;
    const at = (v: number) =>
      centre(a) +
      ((v - a.value) / (b.value - a.value)) * (centre(b) - centre(a));
    const placed: number[] = [];
    let leftMark = centre(a);
    let tightest = Infinity;
    for (const v of members) {
      const x = at(v);
      const clearance = Math.min(x - leftMark, centre(b) - x);
      if (clearance < need) continue;
      placed.push(v);
      tightest = Math.min(tightest, clearance);
      leftMark = x;
    }
    if (placed.length > 0)
      holes.push({
        after: a.value,
        before: b.value,
        missing: placed,
        clearancePx: tightest,
        needPx: need,
      });
  }
  return holes;
}

type AxisReading = {
  file: string;
  width: number;
  drawn: string[];
  step: number;
  holes: Hole[];
  skipped: string | null;
};

describe("a fluid beat retakes its de-collision decisions at the width it is drawn at", () => {
  it("leaves no member of its own axis run missing in a gap with room for it", async () => {
    const files = deliveredHtml(PROOF);
    expect(files.length).toBeGreaterThan(0);

    const browser = await puppeteer.launch({
      executablePath: resolveChrome(),
      args: ["--force-device-scale-factor=1", "--hide-scrollbars"],
    });
    const readings: AxisReading[] = [];
    try {
      const page = await browser.newPage();
      for (const { w, h } of WIDTHS) {
        await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
        for (const file of files) {
          await page.goto(`file://${file}`, { waitUntil: "load" });
          const raw = (await page.evaluate(READ_X_AXIS)) as {
            text: string;
            left: number;
            right: number;
          }[];
          const rel = relative(TWIN, file);
          const values = raw.map((t) => asNumber(t.text));
          if (raw.length < 4 || values.some((v) => v === null)) {
            readings.push({
              file: rel,
              width: w,
              drawn: raw.map((t) => t.text),
              step: 0,
              holes: [],
              skipped:
                raw.length < 4
                  ? `${raw.length} x labels — three points do not establish a step`
                  : "not a numeric axis",
            });
            continue;
          }
          const ticks: Tick[] = raw.map((t, i) => ({
            ...t,
            value: values[i] as number,
          }));
          const step = modalStep(ticks.map((t) => t.value));
          readings.push({
            file: rel,
            width: w,
            drawn: ticks.map((t) => t.text),
            step,
            holes: step > 0 ? holesIn(ticks, step) : [],
            skipped:
              step > 0 ? null : "no repeated step — not an arithmetic run",
          });
        }
      }
    } finally {
      await browser.close();
    }

    const report = readings
      .map(
        (r) =>
          `  ${r.file} @ ${r.width}: ${r.drawn.join(" ")}` +
          (r.skipped ? `  [skip: ${r.skipped}]` : `  [step ${r.step}]`),
      )
      .join("\n");
    const failures = readings.flatMap((r) =>
      r.holes.map(
        (hole) =>
          `${r.file} @ ${r.width}: the drawn x axis ${r.drawn.join(" ")} steps by ${r.step}, and ` +
          `${hole.missing.join(", ")} ${hole.missing.length === 1 ? "is a member" : "are members"} ` +
          `of that run the page does not draw. Placed between ${hole.after} and ${hole.before} at ` +
          `its own position it would clear its neighbours by ${Math.round(hole.clearancePx)}px ` +
          `against the ${Math.round(hole.needPx)}px a label needs — the decision that dropped it ` +
          `was taken at a width this is not`,
      ),
    );

    console.log(
      `axes read at ${WIDTHS.map((v) => v.w).join(" and ")}:\n${report}`,
    );
    expect(failures.join("\n")).toBe("");
  });
});
