// The generic half of a slope WEB beat, taken from
// proof/web-slope-europe-lowcarbon/render-directions-web.mjs with everything about ITS subject
// removed. The interaction is the worked example's and is not the model's to change: every line runs
// from the left rail to the right rail, the thread (one line or one pair) in the accent, the pair's
// crossing ringed WHERE the two lines actually meet; every connector answers hover/tap/Tab with what
// links its two ends (the change, its rank, who it passed); and a "level" control lets the reader lay
// any line's own two values across both rails, so every other line is read against it, with a
// sentence naming who that line passed and who passed it (CSS only, works without JS). This file
// derives the crossings; ./beat.mjs — the one file the model writes — gives the lines and WORDS every
// reading. Copied into the beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { scaleLinear } from "d3-scale";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { DirectedSlopeWeb, slopeY } from "./DirectedSlopeWeb.tsx";
import { applyStoryboard, assertNumbers, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { chartWeb, plain, refusing, renderBeatWeb, storyLanguage } from "./web.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderWeb } = await import(chartWeb(HERE, "scripts", "render-web.mjs"));

  const REQUIRED = ["eyebrow", "lines", "rails", "subject", "format", "detail", "levelLabel", "noneLabel", "announce", "note", "title", "limits", "reading", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")} (see CONTRACT.md)`);
  for (const fn of ["format", "detail", "announce", "note", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  if (beat.crossingNote !== undefined && typeof beat.crossingNote !== "function") throw new Error(`beat.mjs: crossingNote must be a function (see CONTRACT.md)`);

  // ── the lines, refused as the static kit refuses them ────────────────────────────────────────
  if (!Array.isArray(beat.lines) || beat.lines.length < 2) throw new Error(`a slope draws at least two lines; beat.mjs gives ${beat.lines?.length ?? 0}`);
  if (beat.lines.length > 16) throw new Error(`lines holds ${beat.lines.length} lines; a slope seats at most 16 names per rail — keep the thread and the largest others, and say how many of how many in limits`);
  assertNumbers(beat.lines.flatMap((d) => [[`${d.label} from`, d.from], [`${d.label} to`, d.to]]));
  const keys = beat.lines.map((d) => String(d.key ?? d.label));
  if (new Set(keys).size !== keys.length) throw new Error(`two lines share one key`);
  if (!beat.rails || beat.rails.left === undefined || beat.rails.right === undefined) throw new Error(`rails must be { left, right }: what each rail is`);
  const left = plain(beat.rails.left);
  const right = plain(beat.rails.right);
  const threads = beat.lines.filter((d) => d.thread);
  if (!threads.length) throw new Error(`no line has thread: true; the accent must mark the line(s) the title is about`);
  if (threads.length > 2) throw new Error(`${threads.length} lines are the thread; the accent marks one line or one pair`);
  if (!keys.includes(String(beat.subject))) throw new Error(`subject "${beat.subject}" is not the key of a drawn line`);

  beat.check();
  assertDrawsClaimColumn(beat.lines.flatMap((d) => [d.from, d.to]), HERE);

  // ── the readings: each line's change, its rank, and the crossings derived both ways ──────────
  const rows = beat.lines
    .map((d) => ({ key: String(d.key ?? d.label), label: String(d.label ?? d.key), before: d.from, after: d.to, gain: d.to - d.from, thread: Boolean(d.thread) }))
    .sort((a, b) => b.gain - a.gain)
    .map((r, i) => ({ ...r, code: `r${i + 1}`, rank: i + 1 }));
  // A pair crosses when the sign of their gap flips between the rails; `passedBy` is `passed` read
  // the other way, derived from it rather than computed twice.
  const crossesWith = (a, b) => Math.sign(a.before - b.before) !== Math.sign(a.after - b.after);
  const passed = (r) => rows.filter((z) => z.code !== r.code && crossesWith(r, z) && r.after > z.after);
  const passedBy = (r) => rows.filter((z) => passed(z).some((w) => w.code === r.code));
  const readingOf = (r) => ({ label: r.label, from: r.before, to: r.after, gain: r.gain, rank: r.rank, count: rows.length, passed: passed(r).map((z) => z.label), passedBy: passedBy(r).map((z) => z.label), left, right });

  // ── the scale: from zero (or the lowest value) to a round top ────────────────────────────────
  const values = rows.flatMap((r) => [r.before, r.after]);
  const domain = beat.domain ?? scaleLinear().domain([Math.min(0, ...values), Math.max(...values)]).nice(5).domain();
  if (!(Array.isArray(domain) && domain.length === 2 && domain[0] < domain[1])) throw new Error(`domain must be [low, high] with low < high`);
  if (values.some((v) => v < domain[0] || v > domain[1])) throw new Error(`a value lies outside domain [${domain.join(", ")}]: widen it`);
  const yTicks = domain;
  const y = slopeY(yTicks[0], yTicks[yTicks.length - 1]);

  // ── the thread pair's crossing, solved, and ringed where the two lines actually meet ─────────
  const crossings = [];
  const pair = rows.filter((r) => r.thread);
  if (pair.length === 2 && crossesWith(pair[0], pair[1])) {
    const [above, below] = pair[0].after > pair[1].after ? pair : [pair[1], pair[0]];
    const gap0 = above.before - below.before;
    const gap1 = above.after - below.after;
    const t = gap0 / (gap0 - gap1);
    if (!(t > 0 && t < 1)) throw new Error(`the thread pair's crossing sits at t=${t}, outside the two rails`);
    const at = below.before + t * (below.after - below.before);
    const check = above.before + t * (above.after - above.before);
    if (Math.abs(at - check) > 1e-9) throw new Error(`at t=${t} the two lines are at ${at} and ${check}: that is not where they cross`);
    if (typeof beat.crossingNote !== "function") throw new Error(`the thread pair (${above.label}, ${below.label}) crosses between the rails, so the plate rings it and owes the sentence: add crossingNote(c) (see CONTRACT.md)`);
    const text = plain(beat.crossingNote({ above: above.label, below: below.label, gap: below.before - above.before, aboveFrom: above.before, aboveTo: above.after, belowFrom: below.before, belowTo: below.after, pct: t * 100, left, right }));
    crossings.push({ at, t, text });
  }

  const lines = rows.map((r) => ({
    code: r.code,
    name: plain(r.label),
    before: r.before,
    after: r.after,
    beforeLabel: plain(beat.format(r.before)),
    afterLabel: plain(beat.format(r.after)),
    highlight: r.thread,
    detail: plain(beat.detail(readingOf(r))),
  }));
  if (new Set(lines.map((l) => l.detail)).size !== lines.length) throw new Error(`detail() answers two lines with the same sentence: start it with the line's label`);

  // ── the yardstick: every line's own two values laid across both rails ────────────────────────
  const levels = {
    label: plain(beat.levelLabel),
    noneLabel: plain(beat.noneLabel),
    options: rows.map((r) => {
      const o = readingOf(r);
      const option = { key: r.code, label: plain(r.label), announce: plain(beat.announce(o)), note: plain(beat.note(o)), marks: [{ series: left, y: y(r.before) }, { series: right, y: y(r.after) }] };
      if (!option.announce.includes(option.label)) throw new Error(`announce() must contain the line's label (${option.label}); it says: ${option.announce}`);
      const count = o.passed.length;
      const countSaid = new RegExp(`(?<![\\d.,])${count}(?![\\d.,]\\d)`).test(option.note);
      const namesSaid = o.passed.every((name) => option.note.includes(plain(name)));
      if (count > 0 && !countSaid && !namesSaid)
        throw new Error(`note() for ${r.label} must say who it passed — the count (${count}) or every name (${o.passed.join(", ") || "none"}); it says: ${option.note}`);
      return option;
    }),
  };

  assertHeadlineNumbersDrawn([beat.title].flat()[0], [...values, ...rows.map((r) => r.gain), ...crossings.map((c) => Math.abs(c.at))], "lines");

  const title = plain([beat.title].flat()[0]);
  const caveat = plain([beat.limits].flat()[0]);
  const source = plain(beat.source);
  const reading = plain([beat.reading].flat()[0]);
  const eyebrow = plain(beat.eyebrow);
  const alt = plain(typeof beat.alt === "function" ? beat.alt(rows) : beat.alt);
  const subjectRow = rows.find((r) => r.key === String(beat.subject));

  const facts = beatFacts(rows.map((r) => ({ key: r.code, label: r.label, value: r.after })), {
    subject: subjectRow.label,
    states: [left, right],
    markers: rows.map((r) => ({ key: r.code, label: r.label, value: r.before })),
    declaredSequence: right,
  });
  applicableTreatments(facts);

  const interaction = {
    earns:
      `A still has to draw all ${rows.length} lines at once and can carry one pivot, the author's; this page hands the pivot to the reader — ` +
      `any of the ${rows.length} is laid across both rails, and the sentence that comes back says who it passed and who passed it.`,
    controls: [
      {
        question: "Which line is this in the tangle, and what did it cross between the two rails?",
        gesture: "ask-a-line",
        changes: "The connector answers with what links its two ends and neither end carries: the change, its rank among the lines, and every line it passed.",
        parameter: "which line is asked about",
        authorPicked: rows[0].label,
        readerPicks: "every mark",
        heldStill: [".chart-header", ".chart-source"],
      },
      {
        question: "Everything is read against the thread. Against this other line, who passed it and whom did it pass?",
        gesture: "find-your-own-case",
        changes: "Two dashed rules cross the plot at the chosen line's two values; its two dots take a ring and its name full ink while the others step back; a sentence gives its rank and names who it passed and who passed it.",
        parameter: "the line laid across both rails",
        authorPicked: "none",
        readerPicks: ["none", ...rows.map((r) => r.code)],
        heldStill: [".chart-header", ".chart-source"],
      },
    ],
  };

  const textPerRegister = {
    display: title,
    eyebrow,
    body: `${caveat} ${reading} ${source} ${levels.label} ${levels.noneLabel} ${lines.map((l) => l.name).join(" ")} ${levels.options.map((o) => `${o.note} ${o.announce}`).join(" ")}`,
    axis: lines.map((l) => `${l.name} ${l.beforeLabel} ${l.afterLabel}`).join(" "),
    annot: crossings.map((c) => c.text).join(" ") || reading,
    value: `${left} ${right}`,
  };

  await renderBeatWeb({
    here: HERE,
    textPerRegister,
    evidenceLevels: beat.evidenceLevels ?? 3,
    async render({ label, direction, outDir }) {
      return renderWeb({
        lang: beat.lang ?? storyLanguage(HERE) ?? "en",
        component: DirectedSlopeWeb,
        props: { lines, railLabels: { left, right }, yTicks, crossings, levels, interaction, title, eyebrow, caveat, source, reading, alt, direction, ground: direction.ground, accent: direction.accent },
        outDir,
        name: `${label}.html`,
      });
    },
  });
});
