// The half every Position GESTURE kit's runner shares, in every format (Node only: the kits' render-beat.mjs import
// it; nothing browser-side does). Guard order, as the bar kits: importBeat → applyStoryboard → REQUIRED → the values
// (modelOf: a row missing a reading is left out and stated, never refused) → check() and the shared guards → the
// claim read from STORYBOARD.md → validateGestures (family "position", the family's hooks) → the format's scheduler.
// A gesture refusal names the beat.mjs field and a value that works; with SPLASH_GESTURE_REPAIR=1 the refusal's fix
// is applied instead ("REPAIRED gestures: <field> → <fix>") and the list staged again, at most 12 times.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { applyFix, GestureRefusal, validateGestures } from "./gesture-core.mjs";
import { deltaOf, levelsOf, modelOf, positionHooks } from "./gesture-family-position.mjs";
import { applyStoryboard, assertDrawsClaimColumn, assertHeadlineNumbersDrawn, assertNoAggregates, assertNumbers, importBeat, legibleFormat, rowFacts, runCheck } from "./guards.mjs";

export const REPAIR = process.env.SPLASH_GESTURE_REPAIR === "1";

/** The fields every Position beat gives, in every format (a format may ask for more). */
export const REQUIRED = ["eyebrow", "rows", "gestures", "unit", "format", "title", "limits", "source", "alt", "check"];

/** STORYBOARD.md's front matter, as the bar kits read it. */
export function frontOf(here) {
  const file = join(here, "..", "..", "STORYBOARD.md");
  const text = existsSync(file) ? readFileSync(file, "utf8").split("---")[1] ?? "" : "";
  return (key) => text.match(new RegExp(`^${key}:\\s*"?(.*?)"?\\s*$`, "m"))?.[1]?.replace(/\\"/g, '"');
}

/** A refusal's printed hint: the value that works, or "drop that gesture". */
export function hintOf(fix) {
  const value = fix && ("set" in fix ? fix.set.value : "add" in fix ? fix.add.gesture : undefined);
  return "remove" in (fix ?? {}) ? " (drop that gesture)" : value !== undefined ? ` — a value that works: ${JSON.stringify(value)}` : "";
}

/**
 * The beat read, guarded and modelled. Throws a plain Error for anything the beat must fix before staging.
 * @returns { beat, model, claim, format, delta, title, lang }
 */
export async function loadPositionBeat(here, variant, { required = REQUIRED } = {}) {
  const beat = await importBeat(here);
  applyStoryboard(beat, here);
  const missing = required.filter((key) => beat[key] === undefined);
  if (missing.length)
    throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["format", "check"]) if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  if (!Array.isArray(beat.rows) || !beat.rows.length) throw new Error("beat.mjs: rows must be a non-empty array (see CONTRACT.md for this type's row shape)");
  if (!Array.isArray(beat.gestures)) throw new Error("beat.mjs: gestures must be an array of { do, mark | marks, … } (see CONTRACT.md)");
  const model = modelOf(variant, beat);
  if (!model.rows.length) throw new Error(`no row of rows holds the readings a ${model.spec.label} draws (see CONTRACT.md for the row shape): read them from data.json`);
  const names = model.rows.map((r) => r.name);
  if (new Set(names).size !== names.length) throw new Error("rows holds the same name twice: give each row ONE name (one unit per row)");
  if (model.shape === "paired" && (!Array.isArray(beat.moments) || beat.moments.length !== 2 || String(beat.moments[0]) === String(beat.moments[1])))
    throw new Error(`beat.mjs: moments must name the two states each row is read at, as two different strings, e.g. moments: ["2000", "2023"]`);
  const levels = model.rows.flatMap(levelsOf);
  assertNumbers(levels.map((v, i) => [`reading ${i + 1}`, v]));
  runCheck(beat);
  assertDrawsClaimColumn(levels, here);
  assertNoAggregates(names, here);
  const title = [beat.title].flat()[0];
  // How many units data.json holds (a takeaway counts "the 16 countries" when the plate draws six of them).
  const table = existsSync(join(here, "data.json")) ? JSON.parse(readFileSync(join(here, "data.json"), "utf8")) : { columns: [], rows: [] };
  const units = (table.columns ?? []).map((c, i) => (c.type === "text" ? new Set(table.rows.map((r) => r[i])).size : 0)).filter((n) => n > 0);
  const headlineFigures = [model.rows.length, model.rows.length + model.dropped, ...units, ...levels, ...model.rows.map((r) => r.value), ...model.rows.flatMap((r) => (r.change !== undefined ? [r.change, Math.abs(r.change)] : r.stats ? [r.stats.median, r.stats.q1, r.stats.q3] : []))];
  assertHeadlineNumbersDrawn(title, headlineFigures, `${model.spec.label} marks`);
  // The decimals the drawn readings need to read apart: the kit chooses them rather than refusing.
  const format = legibleFormat(levels, beat.format);
  const delta = typeof beat.formatDelta === "function" ? beat.formatDelta : deltaOf(format);
  const front = frontOf(here);
  // Each drawn row's own readings are facts of that row, in one column order for every row (its two levels; its
  // value and size; a group's summary): a note on a row may state them, a percent among them included (the core
  // checks a stated percent against the row's facts), and a rank word may speak of either moment.
  const own = (r) => (r.from !== undefined ? [r.from, r.to] : r.stats ? [r.stats.median, r.stats.q1, r.stats.q3, r.stats.whiskerLo, r.stats.whiskerHi, r.stats.min, r.stats.max] : [r.value, ...(r.size !== undefined ? [r.size] : [])]);
  const facts = { ...rowFacts(here) };
  for (const r of model.rows) facts[r.name] = [...own(r), ...(facts[r.name] ?? [])];
  const claim = {
    takeaway: front("takeaway") ?? title,
    subject: front("subject"),
    comparison: front("comparison"),
    entity: front("claimEntity"),
    versus: front("claimVersus"),
    facts,
    unit: beat.unit,
  };
  return { beat, model, claim, format, delta, title, front };
}

/**
 * The gestures validated and staged by a format's scheduler, repaired when asked. `stage(valid, list)` returns what the
 * format draws; a GestureRefusal it throws is repaired like the core's.
 */
export function stagePosition({ gestures, model, claim, format, stage, pre, repair = REPAIR, steps = 12, log = console.log }) {
  let list = gestures;
  const repairs = [];
  const hooks = positionHooks(model);
  for (let step = 0; ; step++) {
    try {
      pre?.(list);
      const { gestures: valid, entities } = validateGestures({ gestures: list, rows: model.core, family: "position", format, claim, hooks });
      const staged = stage(valid, list, entities);
      return { ...staged, valid, gestures: list, repairs, entities };
    } catch (error) {
      if (!(error instanceof GestureRefusal)) throw error;
      if (!repair || step >= steps) throw new Error(`${error.message}${hintOf(error.fix)}`);
      repairs.push({ field: error.field, fix: error.fix });
      log(`REPAIRED gestures: ${error.field} → ${JSON.stringify(error.fix)}`);
      list = applyFix(list, error.fix);
    }
  }
}

/**
 * A static Position kit's whole run: load, stage onto one plate (composeStaticPosition), render the still through the
 * run's direction, print `look at:`. A refusal prints REFUSED and exits 1.
 */
export async function runStaticPosition(here, variant) {
  const { rm } = await import("node:fs/promises");
  const { basename } = await import("node:path");
  const { createElement } = await import("react");
  const { renderStill } = await import("#shared/chart-beat/render-still.mjs");
  const { readPalette } = await import("#shared/chart-beat/colour.mjs");
  const { composeDirections, filedDirections, report: composeReport, resolveDirectionFamilies } = await import("#shared/design-base/index.mjs");
  const { directionReachable, readRunDirection } = await import("#shared/design-base/run-direction.mjs");
  const { assertBeatMayEnter, directedFrame, exportSizeFromArgv, nameAtSize } = await import("#shared/chart-beat/directed-size.mjs");
  const { errorText } = await import("./guards.mjs");
  const { composeStaticPosition } = await import("./gesture-position-static.mjs");
  const { GesturePositionStatic } = await import("./GesturePositionStatic.tsx");
  const refuse = (message) => {
    console.log(`REFUSED — ${message}`);
    process.exit(1);
  };
  let loaded;
  try {
    loaded = await loadPositionBeat(here, variant);
  } catch (error) {
    refuse(errorText(error));
  }
  const { beat, model, claim, format, delta } = loaded;
  const SIZE = exportSizeFromArgv();
  const FRAME = directedFrame(SIZE);
  if (SIZE !== "landscape") assertBeatMayEnter(here, SIZE, { what: basename(here) });
  let staged;
  try {
    staged = stagePosition({
      gestures: beat.gestures,
      model,
      claim,
      format: "static",
      stage: (valid, _list, entities) => composeStaticPosition({ gestures: valid, model, format, delta, domain: beat.domain, entities }),
    });
  } catch (error) {
    refuse(errorText(error));
  }
  console.log(`  ${model.rows.length} rows${model.dropped ? ` (${model.dropped} left out: no reading)` : ""} · gestures: ${staged.valid.map((g) => `${g.do}${g.marks.length ? ` ${g.marks.join(", ")}` : ""}`).join(" · ")}`);
  const titles = [beat.title].flat();
  const limits = [beat.limits].flat();
  const textPerRegister = {
    display: titles.join(" "),
    eyebrow: beat.eyebrow,
    body: `${limits.join(" ")} ${beat.source}`,
    axis: `${model.rows.map((r) => r.name).join(" ")} ${model.moments.join(" ")} ${beat.unit} 0123456789`,
    annot: [...staged.notes.map((n) => n.text), ...model.rows.map((r) => r.code ?? r.name)].join(" "),
    value: model.rows.map((r) => (r.change !== undefined ? delta(r.change) : format(r.value))).join(" "),
  };
  const labelOf = (id) => id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  let chosen;
  if (directionReachable(here)) {
    const run = readRunDirection(here);
    chosen = { label: labelOf(run.id), direction: run };
  } else {
    const composition = composeDirections({ newsroom: readPalette(here), filed: filedDirections(), beat: { evidenceLevels: beat.evidenceLevels ?? 2 }, textPerRegister });
    if (!composition.offered.length) refuse(`no composed direction holds up for this beat:\n${composeReport(composition, {})}`);
    chosen = { label: labelOf(composition.offered[0].id), direction: composition.offered[0] };
  }
  const direction = resolveDirectionFamilies(chosen.direction, textPerRegister);
  const OUT = join(here, "renders");
  const name = nameAtSize(chosen.label, SIZE);
  try {
    await renderStill({
      element: createElement(GesturePositionStatic, {
        variant,
        model,
        plate: staged,
        format,
        delta,
        title: titles,
        limits,
        source: beat.source,
        alt: beat.alt,
        eyebrow: beat.eyebrow,
        unit: beat.unit,
        scope: beat.scope,
        direction,
        frame: { width: FRAME.width, height: FRAME.height },
      }),
      width: FRAME.width,
      height: FRAME.height,
      outDir: OUT,
      name,
      scale: FRAME.scale,
    });
  } catch (error) {
    for (const ext of ["png", "svg"]) await rm(join(OUT, `${name}.${ext}`), { force: true });
    refuse(errorText(error));
  }
  console.log(`rendered renders/${name}.png`);
  console.log(`look at: ${join(OUT, `${name}.png`)}`);
}

/**
 * A web Position kit's whole run: load, the web scheduler (a resting page and one control per further gesture), the
 * generated interaction declaration, render, verify-web, `look at:`. A refusal leaves renders/ empty and exits 1.
 */
export async function runWebPosition(here, variant) {
  const { webRegisters } = await import("#shared/design-base/web.mjs");
  const { deriveFurniture } = await import("#shared/chart-beat/render-still.mjs");
  const { chartWeb, plain, refusing, renderBeatWeb, storyLanguage } = await import("./web.mjs");
  const { assertPositionWebMapping, assertWebHasAControl, interactionPlanPosition, scheduleWebPosition } = await import("./gesture-position-web.mjs");
  const { GesturePositionWeb } = await import("./GesturePositionWeb.tsx");
  await refusing(here, async () => {
    const { renderWeb } = await import(chartWeb(here, "scripts", "render-web.mjs"));
    const { measureText } = await import(chartWeb(here, "scripts", "render-still.mjs"));
    const { labelBoxPx } = await import(chartWeb(here, "assets", "keyed-note.ts"));
    const { beat, model, claim, format: rawFormat, delta: rawDelta, title: rawTitle } = await loadPositionBeat(here, variant, { required: [...REQUIRED, "restLabel"] });
    if (!String(beat.restLabel).trim()) throw new Error('beat.mjs: restLabel is empty: give the words of the option that shows the page as it lands, e.g. "The field alone"');
    const format = (v) => plain(rawFormat(v));
    const delta = (v) => plain(rawDelta(v));
    const staged = stagePosition({
      gestures: beat.gestures,
      model,
      claim,
      format: "web",
      stage: (valid, list, entities) => {
        assertPositionWebMapping(valid);
        return scheduleWebPosition({ gestures: valid, model, format, delta, domain: beat.domain, entities });
      },
      // The core's own "add a bracket" never ends on a Position family: this check offers a compare first.
      pre: (list) => assertWebHasAControl(list, model, claim),
    });
    const { resting, controls: scheduled } = staged;
    const title = plain(rawTitle);
    const ranked = [...model.rows].sort((a, b) => b.value - a.value).map((r) => r.name);
    const readingOf = (r) => (r.from !== undefined ? `${model.moments[0]} ${format(r.from)} · ${model.moments[1]} ${format(r.to)} · ${delta(r.change)}` : r.stats ? `médiane ${format(r.stats.median)} · ${format(r.stats.q1)} - ${format(r.stats.q3)} · n ${r.stats.n}` : format(r.value));
    const details = Object.fromEntries(model.rows.map((r) => [r.name, plain(beat.detail ? beat.detail(r) : `${r.name} · ${readingOf(r)}${beat.unit ? "" : ""} · ${ranked.indexOf(r.name) + 1} / ${model.rows.length}`)]));
    const restLabel = plain(beat.restLabel);
    const controls = scheduled.map((c) => {
      const chip = plain(c.chip);
      const rows = c.state.compares.at(-1);
      const pieces = c.do === "compare" && rows ? [rows.subject, rows.other].map((n) => details[n].split(" · ").slice(0, 2).join(" ")) : c.do === "filter" ? (() => {
        // What the subset holds, row by row (up to six), else its count and range: a reading the resting page lacks.
        const kept = model.rows.filter((r) => !c.state.hidden.includes(r.name));
        const level = (r) => (r.to ?? r.value ?? r.stats?.median);
        return kept.length <= 6 ? kept.map((r) => `${r.name} ${format(level(r))}`) : [`${kept.length} / ${model.rows.length}`, `${format(Math.min(...kept.map(level)))} - ${format(Math.max(...kept.map(level)))}`];
      })() : [];
      const note = [c.note, ...pieces].filter(Boolean).map(plain).join(" · ");
      return { ...c, legend: plain(c.label ?? c.legend), chip, note, announce: `${chip} — ${note}` };
    });
    const restNotes = resting.notes.map((n) => {
      const t = plain(n.text);
      return n.marks?.length && !n.marks.some((m) => t.includes(m)) ? `${n.marks.join(", ")}: ${t}` : t;
    });
    const eyebrow = plain(beat.eyebrow);
    const caveat = plain([beat.limits].flat()[0]);
    const source = plain(beat.source);
    const unit = plain(beat.unit);
    const alt = plain(typeof beat.alt === "function" ? beat.alt(model.rows) : beat.alt);
    const restLine = model.dropped ? (typeof beat.scope === "function" ? plain(beat.scope(model.rows.length, model.rows.length + model.dropped)) : `${model.rows.length} / ${model.rows.length + model.dropped}`) : null;
    const controlText = controls.flatMap((c) => [c.legend, c.chip, c.note]).join(" ");
    const textPerRegister = {
      display: title,
      eyebrow,
      body: `${caveat} ${restNotes.join(" ")} ${restLabel} ${controlText} ${source} ${restLine ?? ""} ${Object.values(details).join(" ")}`,
      axis: `${unit} ${model.rows.map((r) => r.name).join(" ")} ${model.moments.join(" ")} 0123456789`,
      annot: model.rows.map((r) => r.code ?? r.name).join(" "),
      value: model.rows.map((r) => (r.change !== undefined ? delta(r.change) : format(r.value))).join(" "),
    };
    console.log(`  ${model.rows.length} rows · resting: ${staged.valid.filter((g) => !controls.some((c) => c.index === staged.valid.indexOf(g))).map((g) => g.do).join(", ") || "—"} · controls: ${controls.map((c) => `${c.do} (${c.atom})`).join(", ")}`);
    const subject = resting.state.accent[0] ?? model.rows[0].name;
    const interaction = interactionPlanPosition({ controls, model, subject });
    const lang = beat.lang ?? storyLanguage(here) ?? "en";
    await renderBeatWeb({
      here,
      textPerRegister,
      evidenceLevels: beat.evidenceLevels ?? 2,
      async render({ label, direction, outDir }) {
        const furniture = deriveFurniture(direction.ground);
        const regs = webRegisters(direction, { ink: { ink: furniture.ink, muted: furniture.muted, accent: direction.accent } });
        const widest = variant === "dumbbell-range-plot" ? Math.max(...model.rows.map((r) => labelBoxPx(r.name, { ...regs.axis, fontWeight: 700 }, measureText, { chip: false }).w)) : 0;
        const gutterPx = variant === "dumbbell-range-plot" ? Math.max(60, Math.min(220, Math.ceil(widest + 19))) : 0;
        // The scene's measures, in the page's CSS px at the viewBox's width: what sceneOf lays its labels out with.
        const px = (reg) => regs[reg] ?? regs.axis;
        const text = {
          measure: (t, reg = "annot") => labelBoxPx(String(t), px(reg), measureText, { chip: false }).w,
          lead: (reg = "annot") => labelBoxPx("Hg", px(reg), measureText, { chip: false }).h,
          format,
          delta,
          moments: model.moments,
        };
        const { outPath } = await renderWeb({
          lang,
          component: GesturePositionWeb,
          props: { variant, model, resting: resting.state, controls, details, restLabel, restNotes, restLine, gutterPx, title, eyebrow, caveat, source, unit, alt, text, interaction, direction, ground: direction.ground, accent: direction.accent },
          outDir,
          name: `${label}.html`,
        });
        return { outPath };
      },
    });
  });
}

/**
 * A scrolly Position kit's whole run: load, one card per gesture (./gesture-position-scrolly.mjs) and every card's
 * prose checked, the flat states laid out per stage shape, render, verify-scrolly, one screenshot per card.
 */
export async function runScrollyPosition(here, variant) {
  const { createElement } = await import("react");
  const { deriveFurniture } = await import("#shared/chart-beat/render-still.mjs");
  const { webRegisters } = await import("#shared/design-base/web.mjs");
  const { EYEBROW_TO_DISPLAY, gapOf, registerOf } = await import("#shared/design-base/register.mjs");
  const { plain, refusing, storyLanguage, chartWeb } = await import("./web.mjs");
  const { renderBeatScrolly, scrollySkill } = await import("./scrolly.mjs");
  const { APPLY, checkCardsPosition, driveSource, flatStates, scheduleScrollyPosition, SHAPES } = await import("./gesture-position-scrolly.mjs");
  const { defaultNote } = await import("./gesture-position-static.mjs");
  const { GesturePositionScrolly } = await import("./GesturePositionScrolly.tsx");
  await refusing(here, async () => {
    const { renderScrolly } = await import(scrollySkill(here, "scripts", "render-scrolly.mjs"));
    const { measureText } = await import(chartWeb(here, "scripts", "render-still.mjs"));
    const { labelBoxPx } = await import(chartWeb(here, "assets", "keyed-note.ts"));
    const { beat, model, claim, format: rawFormat, delta: rawDelta, title: rawTitle } = await loadPositionBeat(here, variant);
    const format = (v) => plain(rawFormat(v));
    const delta = (v) => plain(rawDelta(v));
    const hooks = positionHooks(model);
    const fallback = defaultNote(model, format, delta);
    const staged = stagePosition({
      gestures: beat.gestures,
      model,
      claim,
      format: "scrolly",
      stage: (valid, list, entities) => {
        const scheduled = scheduleScrollyPosition({ gestures: valid, model, format, delta, domain: beat.domain, entities });
        const cards = checkCardsPosition({ gestures: valid, list, model, claim, hooks, fallback });
        return { scheduled, cards };
      },
    });
    const { scheduled, cards } = staged;
    const titleForms = [beat.title].flat().map(plain);
    const prose = [...cards.map((c) => c.prose.map(plain)), [plain([beat.limits].flat()[0])]];
    const steps = [...cards.map((c) => c.id), "limits"];
    const eyebrow = plain(beat.eyebrow);
    const source = plain(beat.source);
    const unit = plain(beat.unit);
    const alt = plain(typeof beat.alt === "function" ? beat.alt(model.rows) : beat.alt);
    const notes = [...scheduled.notes.map(plain), ""];
    const textPerRegister = {
      display: titleForms.join(" "),
      eyebrow,
      body: `${prose.flat().join(" ")} ${source}`,
      axis: `${unit} ${model.rows.map((r) => r.name).join(" ")} ${model.moments.join(" ")} 0123456789`,
      annot: model.rows.map((r) => r.code ?? r.name).join(" "),
      value: [...notes, ...model.rows.map((r) => (r.change !== undefined ? delta(r.change) : format(r.value)))].join(" "),
    };
    console.log(`  ${model.rows.length} rows · cards: ${steps.join(" · ")}`);
    const lang = beat.lang ?? storyLanguage(here) ?? "en";
    // The states depend on the direction's type sizes: the direction renderBeatScrolly will pick (the same call, the
    // same words) is picked here first, so the states the verifier checks are the ones the page draws.
    const { pickDirection, plainRegisters } = await import("./web.mjs");
    const picked = pickDirection(here, plainRegisters(textPerRegister), beat.evidenceLevels ?? 2);
    const layOut = (direction) => {
      const { ink, muted } = deriveFurniture(direction.ground);
      const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
      const px = (reg) => regs[reg] ?? regs.axis;
      const text = {
        measure: (t, reg = "annot") => labelBoxPx(String(t), px(reg), measureText, { chip: false }).w,
        lead: (reg = "annot") => labelBoxPx("Hg", px(reg), measureText, { chip: false }).h,
        format,
        delta,
        moments: model.moments,
        web: true,
      };
      return { ink, muted, regs, ...flatStates({ model, cards: scheduled.cards, notes, text, shapes: SHAPES }) };
    };
    const laid = layOut(picked.direction);
    await renderBeatScrolly({
      here,
      states: laid.states,
      textPerRegister,
      evidenceLevels: beat.evidenceLevels ?? 2,
      async render({ label, direction, outDir }) {
        const { ink, muted, regs } = laid;
        const { outPath } = await renderScrolly({
          steps: prose.map((p, i) => ({ id: steps[i], prose: p })),
          reveal: {
            element: createElement(GesturePositionScrolly, { prims: laid.prims, shapes: SHAPES, still: laid.states.at(-1), notes, unit, alt, regs, ground: direction.ground, accent: direction.accent, ink, muted }),
            states: laid.states,
            driver: driveSource(),
            apply: APPLY,
          },
          title: titleForms,
          eyebrow,
          source,
          ground: direction.ground,
          type: { eyebrow: { ...regs.eyebrow, marginBottom: `${gapOf(registerOf(direction, "eyebrow"), EYEBROW_TO_DISPLAY)}px` }, display: regs.display, body: regs.body, source: regs.body },
          lang,
          outDir,
          name: `${label}.html`,
        });
        return { outPath };
      },
    });
  });
}

/**
 * A video Position kit's whole run: load, exactly three gestures (./gesture-position-video.mjs), every event's end
 * state laid out as a scene in Bun at the video size (every word measured), the type floor at every event's end, the
 * look stills, then the mp4.
 */
export async function runVideoPosition(here, variant) {
  const { adjustToContrast, mix, NON_TEXT_CONTRAST_MIN, TEXT_CONTRAST_MIN } = await import("#shared/chart-beat/colour.mjs");
  const { deriveFurniture } = await import("#shared/chart-beat/render-still.mjs");
  const { frameInsetFor, sizeFor, videoExportSize } = await import("#shared/chart-video/sizes.mjs");
  const { EYEBROW_TO_DISPLAY, registerOf } = await import("#shared/design-base/register.mjs");
  const { resolveDirectionFamilies } = await import("#shared/design-base/resolve-families.mjs");
  const { skillScriptFrom } = await import("#shared/design-base/skill-script.mjs");
  const { assertEventFramesReadable, pickDirection, plain, refusing, renderBeatVideo } = await import("./video.mjs");
  const { assertVideoThree, scheduleVideoPosition, EVENTS } = await import("./gesture-position-video.mjs");
  const { placeNotes, sceneOf } = await import("./gesture-family-position.mjs");
  const chartVideo = (...parts) => skillScriptFrom(here, "chart-video", "scripts", ...parts);
  await refusing(here, async () => {
    const SIZE = videoExportSize();
    const { applyCase } = await import(chartVideo("registers.mjs"));
    const { titleCardFor, sourceCreditFor, CREDIT_ONE_LINE, CREDIT_MAX_LINES, verticalInsetFor, widthOf, bandOf, BAND_PROBE } = await import(chartVideo("shots.mjs"));
    const { videoRegistersOf } = await import(chartVideo("video-registers.mjs"));
    const { beat, model, claim, format: rawFormat, delta: rawDelta, title: rawTitle } = await loadPositionBeat(here, variant, { required: ["eyebrow", "rows", "gestures", "unit", "format", "title", "source", "check"] });
    const format = (v) => plain(rawFormat(v));
    const delta = (v) => plain(rawDelta(v));
    const title = plain(rawTitle);
    const sourceForms = [beat.source].flat().map(plain);
    const staged = stagePosition({
      gestures: beat.gestures,
      model,
      claim,
      format: "video",
      pre: (list) => assertVideoThree(list, model, claim),
      stage: (valid, _list, entities) => scheduleVideoPosition({ gestures: valid, model, format, delta, domain: beat.domain, entities }),
    });
    const textPerRegister = {
      display: title,
      eyebrow: plain(beat.eyebrow),
      body: sourceForms.join(" "),
      annot: [...Object.values(staged.notes).filter(Boolean).map((n) => n.text), ...model.rows.map((r) => r.code ?? r.name)].join(" "),
      value: `${model.rows.map((r) => (r.change !== undefined ? delta(r.change) : format(r.value))).join(" ")} 0123456789+−-`,
      axis: `${model.rows.map((r) => r.name).join(" ")} ${model.moments.join(" ")} ${sourceForms.join(" ")} 0123456789`,
    };
    const { label, chosen } = pickDirection(here, textPerRegister, beat.evidenceLevels ?? 2);
    const direction = resolveDirectionFamilies(chosen, textPerRegister);
    const NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
    const resolved = Object.fromEntries(NAMES.map((n) => [n, registerOf(direction, n)]));
    const registers = videoRegistersOf(resolved, SIZE);
    const k = registers.axis.fontSize / resolved.axis.fontSize;
    const row = sizeFor(SIZE);
    const inset = frameInsetFor(SIZE);
    const vInset = verticalInsetFor(SIZE);
    const titleCard = titleCardFor({ registers, eyebrow: plain(beat.eyebrow), title: [title], size: SIZE, eyebrowToDisplay: EYEBROW_TO_DISPLAY });
    let creditBlock;
    try {
      creditBlock = sourceCreditFor({ registers, forms: sourceForms, size: SIZE, k, ...CREDIT_ONE_LINE });
    } catch {
      creditBlock = sourceCreditFor({ registers, forms: sourceForms, size: SIZE, k, measure: 1, maxLines: CREDIT_MAX_LINES });
    }
    const { register: sourceRegister, ...credit } = creditBlock;
    const creditAt = { x: inset, y: row.height - vInset - credit.height };
    const reg = (n) => registers[n] ?? registers.axis;
    const measure = (t, n = "annot") => widthOf(applyCase(String(t), reg(n).transform), reg(n));
    const lead = (n = "annot") => {
      const b = bandOf(BAND_PROBE, reg(n));
      return (b.ascent + b.descent) * 1.25;
    };
    const text = { measure, lead, format, delta, moments: model.moments };
    // The note line above the plot, then the plot down to the credit.
    const unitLine = plain(beat.unit);
    const plotFrame = { x: inset, y: vInset + lead("axis") * 1.6, width: row.width - 2 * inset, height: creditAt.y - lead("axis") - (vInset + lead("axis") * 1.6) };
    const scenes = {};
    const noteOf = { reveal: staged.notes.reveal, subject: staged.notes.subject, conclusion: staged.notes.conclusion };
    for (const e of EVENTS) {
      const scene = sceneOf({ model, state: staged.states[e], frame: plotFrame, text });
      const note = noteOf[e === "hold" ? "conclusion" : e];
      if (note) {
        const { under } = placeNotes({ scene, notes: [note], text, frame: plotFrame });
        // A note no spot in the field holds is written on the line above the plot.
        under.forEach((u, j) => scene.prims.push({ id: `note-${u.index}-top-${j}`, kind: "text", x: plotFrame.x, y: vInset + lead("annot") * 0.6, text: u.text, anchor: "start", reg: "annot", role: "accent", o: 1 }));
      }
      scene.prims.push({ id: "unit", kind: "text", x: row.width - inset, y: vInset + lead("axis") * 0.6, text: unitLine, anchor: "end", reg: "axis", role: "muted", o: e === "establish" ? 0 : 1 });
      // A video sets every word at its register's own weight: a bold run measured in Bun drifted past Chrome's
      // width agreement (2 %), so a marked row is told by its colour and ring alone.
      for (const p of scene.prims) if (p.kind === "text") p.bold = false;
      for (const p of scene.prims) if (p.kind === "text") p.width = Math.round(widthOf(applyCase(String(p.text), reg(p.reg).transform), p.bold ? { ...reg(p.reg), fontWeight: 700 } : reg(p.reg)) * 100) / 100;
      scenes[e] = scene;
    }
    const { ground, accent } = direction;
    const { ink, muted } = deriveFurniture(ground);
    const colours = {
      ground,
      accent,
      ink,
      muted,
      neutral: adjustToContrast(mix(ground, ink, 0.42), ground, NON_TEXT_CONTRAST_MIN) ?? mix(ground, ink, 0.5),
      early: ground,
      copy: adjustToContrast(mix(ground, ink, 0.7), ground, NON_TEXT_CONTRAST_MIN) ?? ink,
      rule: mix(ground, ink, 0.55),
      grid: mix(ground, ink, 0.12),
      accentInk: adjustToContrast(accent, ground, TEXT_CONTRAST_MIN) ?? ink,
      mutedInk: adjustToContrast(muted, ground, TEXT_CONTRAST_MIN) ?? ink,
    };
    const { GESTURE_VIDEO_TIMING } = await import("./timing-contract.ts");
    const props = {
      frame: { width: row.width, height: row.height },
      // A word the field sets in bold (a marked row's name) is its register at 700: carried as its own register so its
      // face is embedded.
      registers: { display: titleCard.register, eyebrow: registers.eyebrow, value: registers.value, axis: registers.axis, annot: registers.annot, source: sourceRegister, valueBold: { ...registers.value, fontWeight: 700 }, axisBold: { ...registers.axis, fontWeight: 700 }, annotBold: { ...registers.annot, fontWeight: 700 } },
      titleCard,
      credit: { ...credit, at: creditAt },
      colours,
      scenes,
      stroke: k * 1.4,
      timing: GESTURE_VIDEO_TIMING,
    };
    console.log(`direction ${label} · gestures: ${staged.valid.map((g, i) => `${["reveal", "subject", "conclusion"][i]} ${g.do}${g.marks.length ? ` ${g.marks.join(", ")}` : ""}`).join(" · ")}`);
    const { GesturePositionFrame } = await import("./GesturePositionFrame.tsx");
    try {
      assertEventFramesReadable(GesturePositionFrame, props, SIZE, label);
    } catch (error) {
      throw new Error(`${error.message} — shorten the words that frame draws (names, notes, the title, source forms)`);
    }
    const T = props.timing;
    const end = (e) => T[e].start + T[e].duration - 1;
    const mid = (e) => Math.round(T[e].start + T[e].duration * 0.5);
    const lookFrames = [
      { name: "end-establish", frame: end("establish") },
      { name: "end-reference", frame: end("reference") },
      { name: `reveal-${staged.valid[0].do}`, frame: mid("reveal") },
      { name: "end-subject", frame: end("subject") },
      { name: "final", frame: T.total - 1 },
    ];
    const { wantedOf } = await import(chartVideo("video-faces.mjs"));
    await renderBeatVideo({
      Frame: GesturePositionFrame,
      here,
      label: SIZE === "landscape" ? label : `${label}-${SIZE}`,
      composition: `zone-video-position-gestures-${SIZE}`,
      size: SIZE,
      props,
      wanted: wantedOf(props.registers),
      lookFrames,
      lookOnly: process.argv.includes("--look-only"),
    });
  });
}
