// THE PICTURE AT ONE FRAME — pure arithmetic, run by the composition in Chrome and by the tests in Bun. Browser-safe.
//
//   - TRAVEL: the lines are drawn from 2000 to 2024 one after another, the largest rise first, each eased (two dates: an
//     arrival); its 2024 value lands with it; the rises are counted as the lines land.
//   - FRANCE: France's line takes the accent — the line to pass.
//   - CHECK: every line that started under France is tested in turn, the lowest 2024 finish first: it lights up, and if it
//     ends under France it steps back; the one that ends above takes the accent, its crossing ringed; the passes counted.
//     The lines that started above France step back as the test begins.
//   - RELEASE: every line comes back — the whole chart — the pair kept in the accent, the crossing ringed.

import { EVENT_ORDER, progressOf } from "#shared/chart-video/timing.ts";
import { clamp01, ease } from "../../skills/scrolly/assets/reveal.mjs";

export const WINDOWS = Object.freeze({
  establish: { title: [-1, 0] },
  reference: { title: [0, 0.2], furniture: [0.05, 0.6] },
  reveal: { travel: [0, 0.95] },
  subject: { france: [0, 0.12], check: [0.1, 0.95] },
  conclusion: { release: [0, 0.5], source: [0.25, 0.7] },
});
const LINEAR = new Set(["travel", "check"]);
/** Of the travel, the share one line's own move takes; of the check, one test's. */
export const MOVE = 0.25;
export const TEST = 0.12;

const windowed = (frame, timing, event, [a, b]) => clamp01((progressOf(frame, timing[event]) - a) / (b - a));
export function fieldAt(field, frame, states, timing) {
  let value = 0;
  EVENT_ORDER.forEach((event, i) => {
    const before = i === 0 ? 0 : states[i - 1][field];
    const delta = states[i][field] - before;
    if (delta === 0) return;
    const t = windowed(frame, timing, event, WINDOWS[event]?.[field] ?? [0, 1]);
    value += delta * (LINEAR.has(field) ? t : ease(t));
  });
  return value;
}

export const moveOf = (t, k, n, share = MOVE) => clamp01((t - (n > 1 ? (k / (n - 1)) * (1 - share) : 0)) / share);
/** A move has landed at 1 — floating point leaves the last one a hair short of it. */
const LANDED = 1 - 1e-9;

/**
 * @param {{ states: any[], timing: any, held: string, climber: string,
 *   lines: Array<{ key: string, travelRank: number, testRank: number|null, passes: boolean }> }} props
 *   `testRank`: the line's place in the test (null for France and the lines that started above it); `passes`: it ends above.
 */
export function sceneAt(props, frame) {
  const at = (f) => fieldAt(f, frame, props.states, props.timing);
  const travel = at("travel");
  const france = at("france");
  const check = at("check");
  const release = at("release");
  const n = props.lines.length;
  const tested = props.lines.filter((d) => d.testRank !== null).length;
  let rose = 0;
  let passed = 0;
  const lines = props.lines.map((d) => {
    const raw = moveOf(travel, d.travelRank, n);
    if (raw >= LANDED) rose += 1;
    let lit = 0;
    let stepBack = 0;
    let accent = d.key === props.held ? france : 0;
    if (d.testRank === null) {
      if (d.key !== props.held) stepBack = clamp01(check / 0.1);
    } else {
      const test = moveOf(check, d.testRank, tested, TEST);
      if (test >= LANDED && d.passes) passed += 1;
      lit = test > 0 && test < LANDED ? Math.sin(Math.PI * test) : 0;
      if (d.passes) accent = ease(clamp01((test - 0.5) / 0.5));
      else stepBack = ease(clamp01((test - 0.5) / 0.5));
    }
    return { travel: ease(raw), arrived: clamp01((raw - 0.85) / 0.15), lit: lit * (1 - release), stepBack: stepBack * (1 - release), accent };
  });
  const climber = props.lines.findIndex((d) => d.key === props.climber);
  return {
    title: at("title"),
    furniture: at("furniture"),
    lines,
    rose,
    passed,
    counting: travel > 0 ? 1 : 0,
    testing: check > 0 ? 1 : 0,
    ring: clamp01((lines[climber].accent - 0.5) / 0.5),
    source: at("source"),
  };
}
