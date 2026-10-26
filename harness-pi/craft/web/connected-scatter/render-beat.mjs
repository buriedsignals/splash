// The generic half of a connected-scatter WEB beat, taken from
// proof/web-connected-scatter-lowcarbon/render-directions-web.mjs with everything about ITS subject
// removed. The interaction is the worked example's and is not the model's to change: every entity is
// an ARROW from its earlier state (a ring) to its later one, and a control lets the reader choose
// which reading the head is aimed at — the whole move, its horizontal leg alone, its vertical leg
// alone, and (when beat.mjs gives every entity a `whatIf` point) a counterfactual third point. The
// tail never moves; every head is a real point of the same plane. Every arrow answers hover/tap/Tab
// with the entity's own reading, at every place its arrow ever is. CSS only, works without JS.
// This file computes the geometry, the legs, the counts and the de-collision of the drawn names;
// ./beat.mjs — the one file the model writes — gives the data and WORDS every reading. Copied into
// the beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { readFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { scaleLinear } from "d3-scale";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { measureText } from "#shared/chart-beat/render-still.mjs";
import { registerOf, leadOf } from "#shared/design-base/register.mjs";
import { filedDirections, resolveDirectionFamilies } from "#shared/design-base/index.mjs";
import { fitY } from "#shared/design-base/web.mjs";
import { DirectedConnectedScatterWeb, FRAME } from "./DirectedConnectedScatterWeb.tsx";
import { applyStoryboard, assertNumbers, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { chartWeb, plain, refusing, renderBeatWeb, storyLanguage } from "./web.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderWeb } = await import(chartWeb(HERE, "scripts", "render-web.mjs"));
  const { assertOneAim } = await import(chartWeb(HERE, "assets", "aim.ts"));

  const REQUIRED = ["eyebrow", "entities", "subject", "from", "to", "xName", "yName", "aimLabel", "tripLabel", "options", "figure", "detail", "title", "limits", "reading", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["figure", "detail", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  if (beat.tickLabel !== undefined && typeof beat.tickLabel !== "function") throw new Error(`beat.mjs: tickLabel must be a function (see CONTRACT.md)`);

  // ── the entities, refused before anything is drawn (the static kit's refusals) ─────────────────
  if (!Array.isArray(beat.entities) || beat.entities.length < 3 || beat.entities.length > 20)
    throw new Error(`entities holds ${beat.entities?.length ?? 0}: a connected scatter draws every entity as one arrow, which holds for 3 to 20 — keep the ones the takeaway is about`);
  for (const e of beat.entities)
    for (const state of ["from", "to"])
      if (!e[state] || typeof e[state] !== "object") throw new Error(`${e.name} has no ${state} state: every entity is { name, label, from: { x, y }, to: { x, y } }`);
  const withWhatIf = beat.entities.filter((e) => e.whatIf !== undefined);
  if (withWhatIf.length && withWhatIf.length !== beat.entities.length)
    throw new Error(`${withWhatIf.length} of ${beat.entities.length} entities carry a whatIf point: give every entity one, or none`);
  const hasWhatIf = withWhatIf.length > 0;
  assertNumbers(
    beat.entities.flatMap((e) => [
      [`${e.name} from.x`, e.from.x], [`${e.name} from.y`, e.from.y], [`${e.name} to.x`, e.to.x], [`${e.name} to.y`, e.to.y],
      ...(hasWhatIf ? [[`${e.name} whatIf.x`, e.whatIf?.x], [`${e.name} whatIf.y`, e.whatIf?.y]] : []),
    ]),
    "states",
  );
  const pointsOf = (e) => [e.from, e.to, ...(hasWhatIf ? [e.whatIf] : [])];
  const negative = beat.entities.filter((e) => pointsOf(e).some((p) => p.x < 0 || p.y < 0));
  if (negative.length)
    throw new Error(`entities hold negative values (${negative.slice(0, 3).map((e) => e.name).join(", ")}): both axes start at zero — draw measures that cannot be negative (shares, levels)`);
  const names = new Set();
  for (const e of beat.entities) {
    if (names.has(e.name)) throw new Error(`two entities are named ${JSON.stringify(e.name)}: one entity per name`);
    names.add(e.name);
  }
  if (!names.has(beat.subject)) throw new Error(`subject ${JSON.stringify(beat.subject)} is not an entity's name; the names are ${[...names].join(", ")}`);
  if (String(beat.from) === String(beat.to)) throw new Error(`from and to are both ${JSON.stringify(beat.from)}: a connected scatter joins two different states`);
  // The claim first: a false title is refused for being false, before any geometry speaks.
  beat.check();
  assertDrawsClaimColumn(beat.entities.flatMap((e) => [e.from.x, e.from.y, e.to.x, e.to.y]), HERE);

  // Each leg is drawn as an arrow of its own, and an arrow of zero length has no direction.
  for (const e of beat.entities) {
    if (e.to.x === e.from.x) throw new Error(`${e.name} has the same x at ${beat.from} and ${beat.to}, so its horizontal leg is an arrow of zero length: this page decomposes every move into its two legs — keep entities that move on both axes`);
    if (e.to.y === e.from.y) throw new Error(`${e.name} has the same y at ${beat.from} and ${beat.to}, so its vertical leg is an arrow of zero length: this page decomposes every move into its two legs — keep entities that move on both axes`);
  }

  const ticksOf = (max) => scaleLinear().domain([0, max]).nice(5).ticks(5);
  const maxX = Math.max(...beat.entities.flatMap((e) => pointsOf(e).map((p) => p.x)));
  const maxY = Math.max(...beat.entities.flatMap((e) => pointsOf(e).map((p) => p.y)));
  const X_TICKS = beat.xTicks ?? ticksOf(maxX);
  const Y_TICKS = beat.yTicks ?? ticksOf(maxY);
  const X_TOP = beat.xTop ?? X_TICKS[X_TICKS.length - 1];
  const Y_TOP = beat.yTop ?? Y_TICKS[Y_TICKS.length - 1];
  if (maxX > X_TOP) throw new Error(`the x axis ends at ${X_TOP} but a state (every option's head included) reaches ${maxX}: end xTicks at or above it, or set xTop`);
  if (maxY > Y_TOP) throw new Error(`the y axis ends at ${Y_TOP} but a state (every option's head included) reaches ${maxY}: end yTicks at or above it, or set yTop`);
  if (X_TICKS.some((t) => t < 0 || t > X_TOP) || Y_TICKS.some((t) => t < 0 || t > Y_TOP)) throw new Error(`a tick lies outside 0–xTop / 0–yTop: keep xTicks within 0–${X_TOP} and yTicks within 0–${Y_TOP}`);


  // ── each entity's own reading, and the summary every option's sentence is worded from ──────────
  const readings = beat.entities.map((e, i) => ({
    ...e,
    key: `e${i + 1}`,
    label: String(e.label ?? e.name),
    dx: e.to.x - e.from.x,
    dy: e.to.y - e.from.y,
    whatIfDx: hasWhatIf ? e.whatIf.x - e.from.x : null,
    whatIfDy: hasWhatIf ? e.whatIf.y - e.from.y : null,
    isSubject: e.name === beat.subject,
  }));
  const subject = readings.find((r) => r.isSubject);
  const by = (field) => (a, b) => a[field] - b[field];
  const dxs = readings.map((r) => r.dx).sort((a, b) => a - b);
  const mid = Math.floor(dxs.length / 2);
  const summary = {
    count: readings.length,
    subject,
    entities: readings,
    right: readings.filter((r) => r.dx > 0),
    left: readings.filter((r) => r.dx < 0),
    up: readings.filter((r) => r.dy > 0).sort(by("dy")).reverse(),
    down: readings.filter((r) => r.dy < 0).sort(by("dy")),
    medianDx: dxs.length % 2 ? dxs[mid] : (dxs[mid - 1] + dxs[mid]) / 2,
    smallestDx: [...readings].sort(by("dx"))[0],
    biggestDx: [...readings].sort(by("dx")).at(-1),
    whatIfUp: hasWhatIf ? readings.filter((r) => r.whatIfDy > 0) : [],
    whatIfDown: hasWhatIf ? readings.filter((r) => r.whatIfDy < 0) : [],
    smallestWhatIfDy: hasWhatIf ? [...readings].sort(by("whatIfDy"))[0] : null,
    biggestWhatIfDy: hasWhatIf ? [...readings].sort(by("whatIfDy")).at(-1) : null,
  };

  // A connected scatter's headline usually counts entities ("five weigh less") or states a move.
  assertHeadlineNumbersDrawn(
    [beat.title].flat()[0],
    [readings.length, summary.up.length, summary.down.length, summary.right.length, summary.left.length, ...readings.flatMap((r) => [r.from.x, r.from.y, r.to.x, r.to.y, r.dx, r.dy])],
    "points",
  );

  // ── the plane ─────────────────────────────────────────────────────────────────────────────────
  const round = (n) => Number(n.toFixed(2));
  const xOf = (v) => (v / X_TOP) * FRAME.width;
  const yOf = fitY(0, Y_TOP, FRAME.height);
  const point = (p) => ({ x: round(xOf(p.x)), y: round(yOf(p.y)) });
  const arrows = readings.map((r) => ({ key: r.key, name: r.label, tail: point(r.from), head: point(r.to), subject: r.isSubject }));

  /** The readings each option aims the head at — the same two states recombined, or the whatIf point. */
  const STATES = [
    { slug: "across", head: (r) => point({ x: r.to.x, y: r.from.y }) },
    { slug: "up", head: (r) => point({ x: r.from.x, y: r.to.y }) },
    ...(hasWhatIf ? [{ slug: "what-if", head: (r) => point(r.whatIf) }] : []),
  ];
  const wordsOf = { across: beat.options.across, up: beat.options.up, "what-if": beat.options.whatIf };
  for (const [slug, field] of [["across", "across"], ["up", "up"], ...(hasWhatIf ? [["what-if", "whatIf"]] : [])]) {
    const w = wordsOf[slug];
    if (!w || typeof w !== "object") throw new Error(`options.${field} is missing: give { label, announce, note(s) } (see CONTRACT.md)`);
    if (typeof w.note !== "function") throw new Error(`options.${field}.note must be a function of the summary (see CONTRACT.md)`);
    if (!String(w.announce ?? "").includes(String(w.label ?? "")) || !String(w.label ?? "").trim())
      throw new Error(`options.${field}.announce must contain options.${field}.label word for word (a screen reader hears announce for the pill it reads as label); it says: ${JSON.stringify(w.announce)}`);
  }
  for (const r of readings) for (const s of STATES) {
    const h = s.head(r);
    const t = point(r.from);
    if (h.x === t.x && h.y === t.y) throw new Error(`${r.name}'s ${s.slug} reading lands on its own tail, so that arrow has no direction: keep entities that move visibly on both axes${s.slug === "what-if" ? ", and a whatIf point away from from" : ""}`);
  }

  const figureOf = (state) => {
    const text = plain(beat.figure(state, subject));
    if (!new RegExp(`^${subject.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:`).test(text))
      throw new Error(`figure("${state}") must start with the subject's label and a colon ("${subject.label} : …"): the note under the plot keys it by that name; it says: ${text}`);
    return text;
  };
  const notes = Object.fromEntries(STATES.map((s) => [s.slug, plain(wordsOf[s.slug].note(summary))]));
  const aim = {
    label: plain(beat.aimLabel),
    noneLabel: plain(beat.tripLabel),
    protect: subject.key,
    figure: { key: subject.key, text: figureOf("trip") },
    options: STATES.map((s) => ({
      key: s.slug,
      label: plain(wordsOf[s.slug].label),
      // The accessible name starts with the visible one — the WCAG 2.5.3 rule aim.ts refuses on.
      announce: plain(`${wordsOf[s.slug].announce} — ${notes[s.slug]}`),
      note: notes[s.slug],
      figure: { key: subject.key, text: figureOf(s.slug === "what-if" ? "whatIf" : s.slug) },
      heads: readings.map((r) => ({ key: r.key, ...s.head(r) })),
    })),
  };

  // ── the answering layer: one anchor wherever the arrow ever is, all carrying the same answer ───
  const details = readings.map((r) => plain(beat.detail(r)));
  const repeated = details.find((d, i) => details.indexOf(d) !== i);
  if (repeated) throw new Error(`detail() answers two entities with the same sentence (${JSON.stringify(repeated)}): start it with the entity's label`);
  const anchors = [];
  readings.forEach((r, i) => {
    const arrow = arrows[i];
    const seen = [];
    for (const place of [arrow.tail, arrow.head, ...STATES.map((s) => s.head(r))]) {
      if (seen.some((p) => Math.hypot(p.x - place.x, p.y - place.y) <= 0.34)) continue;
      seen.push(place);
      anchors.push({ key: r.key, x: place.x, y: place.y, detail: details[i], focusable: seen.length === 1 });
    }
  });

  // ── the drawn names, at the tails no option touches ───────────────────────────────────────────
  const namedNames = beat.named ?? [...summary.down.map((r) => r.name), ...(subject.dy < 0 ? [] : [subject.name])];
  for (const n of namedNames) if (!names.has(n)) throw new Error(`named lists ${JSON.stringify(n)}, which is not an entity's name`);
  if (!namedNames.includes(subject.name)) throw new Error(`named must include the subject ${JSON.stringify(subject.name)}: its figure is keyed by its printed name`);
  if (namedNames.length > 8) throw new Error(`named prints ${namedNames.length} names on the plate; keep at most 8 (the others answer the pointer) — set named to the entities the takeaway is about`);
  const named = readings.filter((r) => namedNames.includes(r.name)).sort((a, b) => a.from.x - b.from.x);

  const title = plain([beat.title].flat()[0]);
  const caveat = plain([beat.limits].flat()[0]);
  const source = plain(beat.source);
  const reading = plain([beat.reading].flat()[0] ?? "");
  const eyebrow = plain(beat.eyebrow);
  const xTitle = plain(beat.xName);
  const yTitle = plain(beat.yName);
  const alt = plain(typeof beat.alt === "function" ? beat.alt(summary) : beat.alt);
  const tickLabel = (t) => plain(beat.tickLabel ? beat.tickLabel(t) : String(t));
  const xTicks = X_TICKS.map((t) => ({ text: tickLabel(t), at: round(xOf(t)) }));
  const yTicks = Y_TICKS.map((t) => ({ text: tickLabel(t), at: round(yOf(t)) }));
  const figures = [aim.figure.text, ...aim.options.map((o) => o.figure.text)];

  const textPerRegister = {
    display: title,
    eyebrow,
    body: `${caveat} ${reading} ${source} ${aim.label} ${aim.noneLabel} ${aim.options.map((o) => `${o.label} ${o.note}`).join(" ")}`,
    axis: [...xTicks, ...yTicks].map((t) => t.text).join(" "),
    annot: `${xTitle} ${yTitle} ${figures.join(" ")}`,
    value: named.map((r) => r.label).join(" "),
  };

  const facts = beatFacts(readings.map((r) => ({ key: r.key, label: r.label, value: r.to.y })), { subject: subject.label, declaredSequence: yTitle });
  applicableTreatments(facts);

  /**
   * Whether two drawn names collide, decided at the NARROWEST frame this format verifies at (the
   * proof's measurement): the widest name in the VALUE register of the widest direction (the run's
   * and the filed ones), against the gap between two tails at a 375 px plot. A vertical offset
   * decided there costs nothing at any wider width.
   */
  const namesFor = (direction) => {
    const valueText = { value: named.map((r) => r.label).join(" ") };
    // The run's direction arrives already fitted; the filed ones are fitted to the same names.
    const regs = [direction, ...filedDirections().map((d) => resolveDirectionFamilies(d, valueText))].map((d) => registerOf(d, "value", {}));
    const widest = Math.max(...regs.flatMap((reg) => named.map((r) => measureText(r.label, { fontSize: reg.fontSize, fontWeight: reg.fontWeight, fontFamily: reg.fontFamily }))));
    const tallest = Math.max(...regs.map((reg) => leadOf(reg)));
    const NARROW_VIEWPORT_PX = 375;
    const NARROW_PLOT_W = NARROW_VIEWPORT_PX - 24 * 2 - 44;
    const NARROW_PLOT_H = (NARROW_VIEWPORT_PX - 24 * 2) / ((FRAME.width + 44) / (FRAME.height + FRAME.xAxisRowPx)) - FRAME.xAxisRowPx;
    const NEAR_X = (widest * FRAME.width) / NARROW_PLOT_W;
    const NEAR_Y = (tallest * FRAME.height) / NARROW_PLOT_H;
    const out = named.map((r) => ({ key: r.key, text: r.label, ...point(r.from), below: false }));
    for (let i = 0; i < out.length; i += 1)
      for (let j = i + 1; j < out.length; j += 1) {
        const a = out[i];
        const b = out[j];
        if (Math.abs(a.x - b.x) >= NEAR_X || Math.abs(a.y - b.y) >= NEAR_Y) continue;
        (a.y > b.y ? a : b).below = true;
      }
    return out;
  };

  const optionSlugs = STATES.map((s) => s.slug);
  const interaction = {
    earns:
      `A still can draw only one of the ${STATES.length + 1} readings of each displacement and a video can only play them once, in the author's order; ` +
      `here the reader goes back and forth between the whole move and each of its legs as often as it takes, on the same axes, ` +
      `and each of the ${readings.length} entities answers with a reading neither axis carries.`,
    controls: [
      {
        question: "How far did it move along each axis, taken one at a time?",
        gesture: "toggle-a-comparison",
        changes: `every arrow keeps its ring and swings its head onto the chosen reading: ${readings.length} horizontal arrows, or ${readings.length} vertical ones of which ${summary.down.length} point down${hasWhatIf ? ", or the counterfactual point" : ""}.`,
        parameter: "which reading the arrow's head is aimed at",
        authorPicked: "none",
        readerPicks: ["none", ...optionSlugs],
        heldStill: [".chart-header", ".chart-source"],
      },
      {
        question: "Which entity is this, and what lies under the two shares?",
        gesture: "ask-a-mark",
        changes: "the arrow pointed at, shaft and head together, steps off its own ink and answers with its two states and the readings the axes do not carry.",
        parameter: "which arrow is asked about",
        authorPicked: subject.label,
        readerPicks: "every mark",
        heldStill: [".chart-header", ".chart-source"],
      },
    ],
  };

  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  await renderBeatWeb({
    here: HERE,
    textPerRegister,
    evidenceLevels: beat.evidenceLevels ?? 2,
    async render({ label, direction, outDir }) {
      const { outPath } = await renderWeb({
        lang,
        component: DirectedConnectedScatterWeb,
        props: {
          arrows, anchors, names: namesFor(direction), aim, xTicks, yTicks, xTitle, yTitle,
          title, eyebrow, caveat, source, reading, alt,
          interaction,
          direction,
          ground: direction.ground,
          accent: direction.accent,
          nameValueSeparator: /^fr\b/.test(lang) ? " : " : ": ",
        },
        outDir,
        name: `${label}.html`,
      });
      // The rules read back off the page just written (assertAimDeclaration saw only the declaration).
      assertOneAim(readFileSync(outPath, "utf8"), aim, arrows, { idPrefix: "chart-stack" });
      return { outPath };
    },
  });
});
