// The generic half of every Time-series GESTURE beat (line, area-and-stacked-area, streamgraph, bump-ranking-over-time),
// shared by the four formats' runners: beat.mjs imported and its words held to the storyboard, the readings read into
// the family's model, the shared guards, and the claim read from STORYBOARD.md. Then the STATIC runner itself: the core
// (validateTime) → the static scheduler (composeTimeStatic) → render → `look at:`. A gesture refusal prints REFUSED
// with the beat.mjs field and a value that works; with SPLASH_GESTURE_REPAIR=1 the refusal's fix is applied instead
// ("REPAIRED gestures: <field> → <fix>") and the list staged again, at most 12 times. Nothing here refuses the data's
// SHAPE (how many series or readings, gaps, negative values, long names): the plate adapts to it. Node only.
import { existsSync, readFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import { applyFix, GestureRefusal } from "./gesture-core.mjs";
import { readPoints, timeModel } from "./gesture-family-time.mjs";
import { applyStoryboard, assertDrawsClaimColumn, assertHeadlineNumbersDrawn, assertLegibleLabels, assertNoAggregates, assertNumbers, errorText, importBeat, legibleFormat, rowFacts, runCheck } from "./guards.mjs";

/** STORYBOARD.md's front matter, one field at a time. */
export function frontOf(here) {
  const file = join(here, "..", "..", "STORYBOARD.md");
  const text = existsSync(file) ? readFileSync(file, "utf8").split("---")[1] ?? "" : "";
  return (key) => text.match(new RegExp(`^${key}:\\s*"?(.*?)"?\\s*$`, "m"))?.[1]?.replace(/\\"/g, '"');
}

/** A refusal as the 12B reads it: the field, what is wrong, and a value that works. */
export function refusalText(error) {
  const { fix } = error;
  const value = fix && ("set" in fix ? fix.set.value : "add" in fix ? fix.add.gesture : undefined);
  const hint = "remove" in (fix ?? {}) ? " (drop that gesture)" : value !== undefined ? ` — a value that works: ${JSON.stringify(value)}` : "";
  return `${error.message}${hint}`;
}

/** The variant's readable name in refusals. */
const WHAT = { line: "line", "area-and-stacked-area": "area", streamgraph: "streamgraph", "bump-ranking-over-time": "bump chart" };

/**
 * beat.mjs read for a Time-series gesture kit: the default export held to STORYBOARD.md, its required fields, its
 * readings in the family's model, check() and the shared guards, and the claim the core reads.
 *
 * @param required  the format's required fields (beyond points and gestures)
 */
export async function loadTimeBeat(here, variant, { required = [], format: wanted = "static" } = {}) {
  const beat = await importBeat(here);
  applyStoryboard(beat, here);
  const REQUIRED = ["eyebrow", "points", "gestures", "unit", "title", "source", "check", ...required];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["check", ...(beat.format !== undefined ? ["format"] : [])]) if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  if (!Array.isArray(beat.gestures)) throw new Error("beat.mjs: gestures must be an array of { do, mark | marks, … } (see CONTRACT.md)");

  const front = frontOf(here);
  const points = readPoints(beat.points, { fallbackSeries: beat.entity ?? front("subject") ?? "—" });
  // A reading that is not a number is a gap, drawn as one; a reading that is a number must be a finite one.
  assertNumbers(points.filter((p) => !Number.isNaN(p.value)).map((p) => [`${p.series} ${p.key}`, p.value]), "points");
  if (!(Number(beat.slots ?? 10) >= 2)) throw new Error(`beat.mjs: slots is ${JSON.stringify(beat.slots)}: give how many ranks the bump chart draws, e.g. 10`);
  const lang = beat.lang ?? front("language") ?? "en";
  const model = timeModel({ variant, points, slots: Math.round(Number(beat.slots ?? 10)), lang, order: beat.order });
  if (model.times.length < 2) throw new Error(`points hold ${model.times.length} time(s): a ${WHAT[variant]} needs readings at two times at least`);
  if (!model.marks.length) throw new Error(`no reading of points can be drawn (every value is missing, or no series reaches the top ${model.slots})`);
  runCheck(beat);

  const measures = model.marks.map((m) => model.measureOf.get(m.name));
  const format = legibleFormat(measures, beat.format ?? ((v) => String(Math.round(v * 100) / 100)));
  beat.format = format;
  assertLegibleLabels(measures, format);
  assertDrawsClaimColumn(measures, here);
  assertNoAggregates(model.series, here);
  const titleForms = [beat.title].flat().map(String);
  const ranks = variant === "bump-ranking-over-time" ? model.marks.map((m) => m.value) : [];
  assertHeadlineNumbersDrawn(titleForms[0], [...measures, ...ranks], WHAT[variant]);

  const claim = {
    takeaway: front("takeaway") ?? titleForms[0],
    subject: front("subject"),
    comparison: front("comparison"),
    entity: front("claimEntity"),
    versus: front("claimVersus"),
    facts: rowFacts(here),
    unit: beat.unit,
  };
  const lastValue = Object.fromEntries(
    model.series.map((s) => {
      const last = model.marks.filter((m) => m.series === s).at(-1);
      return [s, last && variant !== "bump-ranking-over-time" ? format(model.measureOf.get(last.name)) : ""];
    }),
  );
  const shape = {
    variant,
    series: model.series,
    geometry: [...model.geometry.entries()],
    gaps: model.gaps,
    gapLabel: beat.gapLabel ?? model.gapLabel,
    domain: model.domain,
    t0: model.t0,
    t1: model.t1,
    slots: model.slots,
    lastValue,
  };
  return { beat, model, claim, format, titleForms, lang, shape, fallbackSubject: beat.entity ?? beat.subject, wanted };
}

/** The repair loop every runner shares: stage(list) until it holds, each refusal's fix applied under REPAIR. */
export function staged(stage, gestures, { repair = process.env.SPLASH_GESTURE_REPAIR === "1", steps = 12 } = {}) {
  let list = gestures;
  for (let step = 0; ; step++) {
    try {
      return { ...stage(list), gestures: list };
    } catch (error) {
      if (!(error instanceof GestureRefusal)) throw error;
      if (!repair || step >= steps) throw new Error(refusalText(error));
      console.log(`REPAIRED gestures: ${error.field} → ${JSON.stringify(error.fix)}`);
      list = applyFix(list, error.fix);
    }
  }
}

/** The STATIC runner: one plate, every gesture composed on it. */
export async function runTimeStatic(here, variant) {
  const { createElement } = await import("react");
  const { renderStill } = await import("#shared/chart-beat/render-still.mjs");
  const { readPalette } = await import("#shared/chart-beat/colour.mjs");
  const { composeDirections, filedDirections, report: composeReport, resolveDirectionFamilies } = await import("#shared/design-base/index.mjs");
  const { directionReachable, readRunDirection } = await import("#shared/design-base/run-direction.mjs");
  const { assertBeatMayEnter, directedFrame, exportSizeFromArgv, nameAtSize } = await import("#shared/chart-beat/directed-size.mjs");
  const { validateTime } = await import("./gesture-family-time.mjs");
  const { composeTimeStatic } = await import("./gesture-time-static.mjs");
  const { GestureTimeStatic } = await import("./GestureTimeStatic.tsx");

  let loaded;
  try {
    loaded = await loadTimeBeat(here, variant, { required: ["limits", "alt"], format: "static" });
  } catch (error) {
    console.log(`REFUSED — ${errorText(error)}`);
    process.exit(1);
  }
  const { beat, model, claim, format, titleForms, shape, fallbackSubject } = loaded;
  const SIZE = exportSizeFromArgv();
  const FRAME = directedFrame(SIZE);
  assertBeatMayEnter(here, SIZE, { what: "this beat" });

  let result;
  try {
    result = staged((list) => {
      const valid = validateTime({ gestures: list, model, format: "static", claim, fallbackSubject });
      const plate = composeTimeStatic({ model, valid: valid.gestures, format, subject: valid.subject });
      return { valid, plate };
    }, beat.gestures);
  } catch (error) {
    console.log(`REFUSED — ${errorText(error)}`);
    process.exit(1);
  }
  const { plate } = result;
  console.log(`  ${model.series.length} series · ${model.times.length} times · ${model.marks.length} readings drawn · ${model.gaps.length} gap(s) · accent ${plate.accent} · gestures: ${result.valid.gestures.map((g) => g.do).join(", ")}`);

  const limits = [beat.limits].flat().map(String);
  const textPerRegister = {
    display: titleForms.join(" "),
    eyebrow: String(beat.eyebrow),
    body: `${limits.join(" ")} ${beat.source}`,
    axis: `${model.times.join(" ")} ${beat.unit}`,
    annot: [...model.series, ...plate.points.map((p) => p.text), ...plate.captions.map((c) => c.text), ...[...plate.levels, ...plate.copies, ...plate.crossings, ...plate.brackets, ...plate.references].map((x) => x.text ?? "")].join(" "),
    value: model.marks.slice(0, 50).map((m) => format(model.measureOf.get(m.name))).join(" "),
  };
  const labelOf = (id) => String(id).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  let chosen;
  if (directionReachable(here)) {
    const run = readRunDirection(here);
    chosen = { label: labelOf(run.id), direction: run };
  } else {
    const composition = composeDirections({ newsroom: readPalette(here), filed: filedDirections(), beat: { evidenceLevels: beat.evidenceLevels ?? 3 }, textPerRegister });
    if (!composition.offered.length) {
      console.log(`REFUSED — no composed direction holds up for this beat:\n${composeReport(composition, {})}`);
      process.exit(1);
    }
    chosen = { label: labelOf(composition.offered[0].id), direction: composition.offered[0] };
  }
  const direction = resolveDirectionFamilies(chosen.direction, textPerRegister);
  const OUT = join(here, "renders");
  const name = nameAtSize(chosen.label, SIZE);
  try {
    await renderStill({
      element: createElement(GestureTimeStatic, {
        frame: { width: FRAME.width, height: FRAME.height },
        shape,
        plate,
        format,
        title: titleForms,
        limits,
        source: String(beat.source),
        alt: String(typeof beat.alt === "function" ? beat.alt(model) : beat.alt),
        eyebrow: String(beat.eyebrow),
        unit: String(beat.unit ?? ""),
        direction,
      }),
      width: FRAME.width,
      height: FRAME.height,
      outDir: OUT,
      name,
      scale: FRAME.scale,
    });
  } catch (error) {
    for (const ext of ["png", "svg"]) await rm(join(OUT, `${name}.${ext}`), { force: true });
    console.log(`REFUSED — ${errorText(error)}`);
    process.exit(1);
  }
  console.log(`rendered renders/${name}.png`);
  console.log(`look at: ${join(OUT, `${name}.png`)}`);
}
