// The generic half of a radar (spider) WEB beat, taken from
// proof/web-radar-electricity-mix/render-directions-web.mjs with everything about ITS subject
// removed. The interaction is the worked example's and is not the model's to change: two shapes on
// the same spokes, and a "spokes counted" control that takes spokes OUT OF THE COUNT — every spoke
// keeps its angle and its name, every vertex stays where it is, the outline stops passing through the
// set-aside ones (CSS only, works without JS) — with the two areas and their ratio printed on the plot
// in every state, because a radar's AREA moves with which spokes are counted while no number does.
// Every vertex answers hover/tap/Tab with its value and the other shape's on the same spoke. This file
// measures every area on the very coordinates the page draws; ./beat.mjs — the one file the model
// writes — gives the two shapes, the subsets and WORDS every reading. Copied into the beat by the
// harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { readFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { skillScriptFrom } from "#shared/design-base/skill-script.mjs";
import { DirectedRadarWeb, FRAME } from "./DirectedRadarWeb.tsx";
import { applyStoryboard, assertNumbers, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { chartWeb, plain, refusing, renderBeatWeb, storyLanguage } from "./web.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderWeb } = await import(chartWeb(HERE, "scripts", "render-web.mjs"));
  const { countedOutline, enclosedArea, assertCountChangesThePicture } = await import(skillScriptFrom(HERE, "chart-web", "assets", "count.ts"));

  const REQUIRED = ["eyebrow", "axes", "shapes", "subject", "ringLabel", "detail", "countLabel", "noneLabel", "noneNote", "counts", "readout", "title", "limits", "reading", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")} (see CONTRACT.md)`);
  for (const fn of ["ringLabel", "detail", "readout", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);

  // ── the spokes and the two shapes ─────────────────────────────────────────────────────────────
  if (!Array.isArray(beat.axes) || beat.axes.length < 5 || beat.axes.length > 10)
    throw new Error(`axes holds ${beat.axes?.length} spokes; this page draws 5 to 10 (under 5 a count that sets two aside leaves no shape; over 10 the names collide)`);
  const axisKeys = beat.axes.map((a) => String(a.key));
  if (new Set(axisKeys).size !== axisKeys.length) throw new Error(`two axes share the key ${axisKeys.find((k, i) => axisKeys.indexOf(k) !== i)}`);
  for (const a of beat.axes) if (plain(a.name).length > 16) throw new Error(`axis name "${a.name}" is ${plain(a.name).length} characters; it hangs off its spoke outside the ring — keep it to 16`);
  if (!Array.isArray(beat.shapes) || beat.shapes.length !== 2) throw new Error(`shapes holds ${beat.shapes?.length} items; this page compares exactly 2 shapes`);
  for (const s of beat.shapes) {
    assertNumbers(axisKeys.map((k) => [`${s.name} ${k}`, s.values?.[k]]), `${s.name}'s values`);
    const neg = axisKeys.find((k) => s.values[k] < 0);
    if (neg) throw new Error(`${s.name} has ${s.values[neg]} on ${neg}: a radar reads distance from the centre, it cannot draw a negative value`);
  }
  const subjectIndex = beat.shapes.findIndex((s) => String(s.key) === String(beat.subject));
  if (subjectIndex < 0) throw new Error(`subject ${JSON.stringify(beat.subject)} is not the key of one of the two shapes (${beat.shapes.map((s) => s.key).join(", ")})`);
  // The subject is drawn in the accent (tone "a") and measured as the first shape.
  const ordered = subjectIndex === 0 ? beat.shapes : [beat.shapes[1], beat.shapes[0]];
  const [A, B] = ordered.map((s, i) => ({ code: `s${i + 1}`, key: s.key, name: plain(s.name), values: s.values, amounts: s.amounts ?? null }));
  const axes = beat.axes.map((a, i) => ({ key: `x${i + 1}`, own: String(a.key), name: plain(a.name) }));
  const ownOf = new Map(axes.map((a) => [a.key, a.own]));
  const valueOf = (shape, axisKey) => shape.values[ownOf.get(axisKey)];

  // ── the scale: a round ceiling and rings every two steps ─────────────────────────────────────
  const most = Math.max(...[A, B].flatMap((s) => axes.map((a) => valueOf(s, a.key))));
  if (!(most > 0)) throw new Error(`every value is 0: there is no shape to draw`);
  const step = 10 ** Math.floor(Math.log10(most));
  const ceiling = Math.ceil(most / step) * step;
  const rings = Array.from({ length: Math.floor(ceiling / (2 * step)) }, (_, i) => (i + 1) * 2 * step).filter((r) => r <= ceiling);
  if (rings[rings.length - 1] !== ceiling) rings.push(ceiling);

  // ── THE TYPE'S WEAK POINT, MEASURED ON THE COORDINATES THE PAGE DRAWS ────────────────────────
  const CX = FRAME.width / 2;
  const CY = FRAME.height / 2;
  const RADIUS = Math.min(CX, CY) - 70;
  const angleOf = (slot) => (slot / axes.length) * Math.PI * 2 - Math.PI / 2;
  const vertexOf = (slot, v) => [CX + (v / ceiling) * RADIUS * Math.cos(angleOf(slot)), CY + (v / ceiling) * RADIUS * Math.sin(angleOf(slot))];
  const VERTICES = Object.fromEntries([A, B].map((s) => [s.code, Object.fromEntries(axes.map((a, slot) => [a.key, vertexOf(slot, valueOf(s, a.key))]))]));
  const disc = Math.PI * RADIUS * RADIUS;
  const areaPct = (counts, shape) => (enclosedArea(countedOutline(axes, counts, VERTICES[shape.code])) / disc) * 100;
  const PLATE = axes.map((a) => a.key);
  const ratioOf = (counts) => areaPct(counts, B) / areaPct(counts, A);
  const plateRatio = ratioOf(PLATE);
  if (!(areaPct(PLATE, A) > 0) || !(areaPct(PLATE, B) > 0)) throw new Error(`one shape encloses no area on the full set of spokes: a radar compares two outlines — draw bars`);

  // Every count that drops AT MOST TWO spokes: comparisons somebody could publish with a straight face.
  const DROPPABLE = 2;
  const everyCount = [];
  for (let mask = 1; mask < 1 << PLATE.length; mask++) {
    const counts = PLATE.filter((_, i) => mask & (1 << i));
    if (counts.length >= PLATE.length - DROPPABLE && areaPct(counts, A) > 0 && areaPct(counts, B) > 0) everyCount.push(counts);
  }
  const spanOf = (pick) => {
    let lo = Infinity;
    let hi = -Infinity;
    for (const counts of everyCount) {
      const v = pick(counts);
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
    return { lo, hi };
  };
  const subjectSpan = spanOf((counts) => areaPct(counts, A));
  const ratioSpan = spanOf(ratioOf);
  const turnsOver = (counts) => (ratioOf(counts) - 1) * (plateRatio - 1) < 0;
  const flipped = everyCount.filter(turnsOver).length;
  // The page's argument: which spokes are counted is an editorial decision about area. If dropping one
  // or two barely moves it, the gesture is worth nothing and the beat should ship as a still.
  if (!(subjectSpan.hi / subjectSpan.lo > 2))
    throw new Error(`across the ${everyCount.length} counts that set at most ${DROPPABLE} of the ${PLATE.length} spokes aside, ${A.name}'s area only moves by a factor of ${(subjectSpan.hi / subjectSpan.lo).toFixed(2)} — not enough to be worth the reader's gesture: draw a static radar`);

  /** What every reading sentence about one count is built from. */
  const countReading = (counts) => ({
    counted: counts.map((k) => axes.find((a) => a.key === k).name),
    aside: PLATE.filter((k) => !counts.includes(k)).map((k) => axes.find((a) => a.key === k).name),
    areaA: areaPct(counts, A),
    areaB: areaPct(counts, B),
    ratio: ratioOf(counts),
    plateAreaA: areaPct(PLATE, A),
    plateAreaB: areaPct(PLATE, B),
    plateRatio,
    turnsOver: turnsOver(counts),
    nameA: A.name,
    nameB: B.name,
  });
  const plateReading = countReading(PLATE);

  // ── the subsets the reader may count ──────────────────────────────────────────────────────────
  if (!Array.isArray(beat.counts) || beat.counts.length < 1 || beat.counts.length > 3)
    throw new Error(`counts holds ${beat.counts?.length} subsets; offer 1 to 3 editorial subsets of the spokes`);
  const options = beat.counts.map((c, i) => {
    for (const f of ["label", "axes", "announce", "note", "alt"]) if (c[f] === undefined) throw new Error(`counts[${i}] is missing ${f} (see CONTRACT.md)`);
    for (const f of ["announce", "note", "alt"]) if (typeof c[f] !== "function") throw new Error(`counts[${i}].${f} must be a function (see CONTRACT.md)`);
    const unknown = c.axes.find((k) => !axisKeys.includes(String(k)));
    if (unknown !== undefined) throw new Error(`counts[${i}] ("${c.label}") counts ${JSON.stringify(unknown)}, which is not an axis key (${axisKeys.join(", ")})`);
    const counts = axes.filter((a) => c.axes.map(String).includes(a.own)).map((a) => a.key);
    if (counts.length < 3) throw new Error(`counts[${i}] ("${c.label}") counts ${counts.length} spoke(s); under 3 the outline encloses nothing`);
    if (counts.length === PLATE.length) throw new Error(`counts[${i}] ("${c.label}") counts every spoke: that is the untouched view under a second name`);
    if (!(areaPct(counts, A) > 0) || !(areaPct(counts, B) > 0)) throw new Error(`counts[${i}] ("${c.label}") leaves one shape enclosing no area: choose spokes on which both shapes have readings`);
    const r = countReading(counts);
    const option = { key: `c${i + 1}`, label: plain(c.label), announce: plain(c.announce(r)), note: plain(c.note(r)), readout: plain(beat.readout(r)), counts, alt: plain(c.alt(r)) };
    if (!option.announce.includes(option.label)) throw new Error(`counts[${i}].announce() must contain its label "${option.label}" word for word; it says: ${option.announce}`);
    return option;
  });
  const plateReadout = plain(beat.readout(plateReading));
  for (const o of options) if (o.readout === plateReadout) throw new Error(`readout() prints the same words for "${o.label}" as for every spoke ("${plateReadout}"): it must state the two areas it is given`);
  const countPlan = { label: plain(beat.countLabel), noneLabel: plain(beat.noneLabel), noneNote: plain(beat.noneNote), options };

  const checkArgs = { plate: plateReading, options: options.map((o) => ({ label: o.label, ...countReading(o.counts) })), span: subjectSpan, ratioSpan, flipped, everyCount: everyCount.length };
  beat.check(checkArgs);
  assertDrawsClaimColumn([A, B].flatMap((s) => axes.map((a) => valueOf(s, a.key))), HERE);
  assertHeadlineNumbersDrawn([beat.title].flat()[0], [A, B].flatMap((s) => axes.map((a) => valueOf(s, a.key))), "vertices");

  // ── every vertex's reading, the same in every state but for the aside clause ──────────────────
  const detailOf = (shape, other, a, aside) =>
    plain(beat.detail({ name: shape.name, axis: a.name, value: valueOf(shape, a.key), amount: shape.amounts ? shape.amounts[a.own] : null, otherName: other.name, otherValue: valueOf(other, a.key), aside }));
  const shapes = [A, B].map((s, i) => {
    const other = i === 0 ? B : A;
    return {
      code: s.code,
      name: s.name,
      tone: i === 0 ? "a" : "b",
      values: Object.fromEntries(axes.map((a) => [a.key, valueOf(s, a.key)])),
      details: Object.fromEntries(axes.map((a) => [a.key, detailOf(s, other, a, false)])),
      asideDetails: Object.fromEntries(axes.map((a) => [a.key, detailOf(s, other, a, true)])),
    };
  });
  const all = shapes.flatMap((s) => Object.values(s.details));
  if (new Set(all).size !== all.length) throw new Error(`two vertices answer with the same words: detail() must name the shape and the spoke`);
  for (const s of shapes) for (const a of axes) if (s.details[a.key] === s.asideDetails[a.key]) throw new Error(`detail() says the same for ${s.name} · ${a.name} counted and set aside: when r.aside is true it must say the outline no longer passes through this vertex`);

  const title = plain([beat.title].flat()[0]);
  const caveat = plain([beat.limits].flat()[0]);
  const source = plain(beat.source);
  const reading = plain(typeof beat.reading === "function" ? beat.reading(checkArgs) : beat.reading);
  const eyebrow = plain(beat.eyebrow);
  const alt = plain(typeof beat.alt === "function" ? beat.alt(checkArgs) : beat.alt);
  const ceilingLabel = plain(beat.ringLabel(ceiling));

  const facts = beatFacts(axes.map((a) => ({ key: a.key, label: a.name, value: valueOf(A, a.key) })), { subject: A.name, declaredSequence: plain(beat.unit ?? "%") });
  applicableTreatments(facts);

  const countWords = [countPlan.noneNote, ...options.map((o) => `${o.label} ${o.announce} ${o.note} ${o.readout}`)].join(" ");
  const textPerRegister = {
    display: title,
    eyebrow,
    body: `${caveat} ${reading} ${source} ${A.name} ${B.name} ${countPlan.label} ${countPlan.noneLabel} ${countWords}`,
    axis: `${axes.map((a) => a.name).join(" ")} ${ceilingLabel}`,
    annot: `${plateReadout} ${options.map((o) => o.readout).join(" ")}`,
    value: [A, B].flatMap((s) => axes.map((a) => plain((beat.format ?? String)(valueOf(s, a.key))))).join(" "),
  };

  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  await renderBeatWeb({
    here: HERE,
    textPerRegister,
    evidenceLevels: beat.evidenceLevels ?? 2,
    async render({ label, direction, outDir }) {
      const out = await renderWeb({
        lang,
        component: DirectedRadarWeb,
        props: { axes: axes.map(({ key, name }) => ({ key, name })), shapes, rings, ceiling, ceilingLabel, countPlan, plateReadout, title, eyebrow, caveat, source, reading, alt, direction, ground: direction.ground, accent: direction.accent },
        outDir,
        name: `${label}.html`,
        // A radar is radial: the same distance must mean the same number in every direction, so the
        // frame never opens — the surplus width stays margin, as the worked example declares.
        frame: {
          extends: false,
          base: { width: FRAME.width, height: FRAME.height },
          why:
            "A radar is radial: the reading IS the distance from one centre, and the same distance must mean the same number in every direction. " +
            "A wider frame either makes the rings ellipses, which makes the radius lie, or keeps them round and pads the sides. So nothing opens.",
        },
      });
      // The worked example measures the written page: each count must change the picture.
      assertCountChangesThePicture(readFileSync(out.outPath, "utf8"), { ...countPlan, axes: axes.map(({ key, name }) => ({ key, name })) }, `renders/${label}.html`);
      return out;
    },
  });
});
