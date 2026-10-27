// The generic half of every keyed-family GESTURE kit's render-beat.mjs (interval, multiples, flow, profile), in Bun:
// the bar kits' guard order, shared. importBeat → applyStoryboard → REQUIRED → the family's model (the data's shape is
// adapted to, never refused) → check() → the shared guards → the gesture core with the claim read from STORYBOARD.md
// (`stageKeyedFormat`) → the format's scheduler → render → verify → `look at:`. A gesture refusal prints
// `REFUSED — <field>: <message> — a value that works: …`; with SPLASH_GESTURE_REPAIR=1 each fix is applied instead
// ("REPAIRED gestures: <field> → <fix>"), at most 12 times. Node-only (the formats' browser code never imports it).
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { GestureRefusal } from "./gesture-core.mjs";
import { stageKeyedFormat } from "./gesture-keyed.mjs";
import { applyStoryboard, assertNoAggregates, importBeat, rowFacts, runCheck } from "./guards.mjs";

export const REPAIR = () => process.env.SPLASH_GESTURE_REPAIR === "1";

/** STORYBOARD.md's front matter, as the bar kits read it. */
export function frontOf(here) {
  const file = join(here, "..", "..", "STORYBOARD.md");
  const text = existsSync(file) ? readFileSync(file, "utf8").split("---")[1] ?? "" : "";
  return (key) => text.match(new RegExp(`^${key}:\\s*"?(.*?)"?\\s*$`, "m"))?.[1]?.replace(/\\"/g, '"');
}

export function claimOf(here, fallbackTitle, unit) {
  const front = frontOf(here);
  return {
    takeaway: front("takeaway") ?? fallbackTitle,
    subject: front("subject"),
    comparison: front("comparison"),
    entity: front("claimEntity"),
    versus: front("claimVersus"),
    facts: rowFacts(here),
    unit,
  };
}

/** A refusal as the 12B reads it: the field, the message, and the value that works. */
export function refusalText(error) {
  const { fix } = error;
  const value = fix && ("set" in fix ? fix.set.value : "add" in fix ? fix.add.gesture : undefined);
  const hint = "remove" in (fix ?? {}) ? " (drop that gesture)" : value !== undefined ? ` — a value that works: ${JSON.stringify(value)}` : "";
  return `${error.message}${hint}`;
}

/**
 * Loads and checks the beat, builds the family's model and stages its gestures for `format`.
 *
 * @param spec      the family spec (gesture-family-<id>.mjs)
 * @param required  the beat.mjs fields this kit needs (beyond the family's own)
 * @param modelOf   (beat) → the family's model; throws a plain Error naming the field when the beat's shape is unusable
 * @param namesOf   (model) → the entity names (aggregate guard)
 */
export async function loadKeyed({ here, spec, format, required, modelOf, namesOf, unit }) {
  const beat = await importBeat(here);
  applyStoryboard(beat, here);
  const missing = required.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  if (typeof beat.check !== "function") throw new Error("beat.mjs: check must be a function (see CONTRACT.md)");
  if (!Array.isArray(beat.gestures)) throw new Error("beat.mjs: gestures must be an array of { do, mark | marks, … } (see CONTRACT.md)");
  const format_ = typeof beat.format === "function" ? (v) => String(beat.format(v)).replace(/[  ]/g, " ") : (v) => String(Math.round(v * 10) / 10);
  const model = modelOf(beat);
  runCheck(beat);
  assertNoAggregates(namesOf(model), here);
  const title = [beat.title].flat()[0];
  const claim = claimOf(here, title, unit ?? beat.unit);
  let staged;
  try {
    staged = stageKeyedFormat({ spec, model, format, gestures: beat.gestures, claim, valueFormat: format_, repair: REPAIR() });
  } catch (error) {
    if (!(error instanceof GestureRefusal)) throw error;
    throw new Error(refusalText(error));
  }
  for (const r of staged.repairs) console.log(`REPAIRED gestures: ${r.field} → ${JSON.stringify(r.fix)}`);
  return { beat, model, staged, format: format_, title };
}

/** A static kit's whole run: load, stage, compose, render one still in the run's direction, print `look at:`. */
export async function runKeyedStatic({ here, spec, Component, variant, required, modelOf, namesOf }) {
  const { rm } = await import("node:fs/promises");
  const { basename } = await import("node:path");
  const { createElement } = await import("react");
  const { renderStill } = await import("#shared/chart-beat/render-still.mjs");
  const { assertBeatMayEnter, directedFrame, exportSizeFromArgv, nameAtSize } = await import("#shared/chart-beat/directed-size.mjs");
  const { errorText } = await import("./guards.mjs");
  const { pickDirection, plainRegisters } = await import("./web.mjs");
  let loaded;
  try {
    loaded = await loadKeyed({ here, spec, format: "static", required, modelOf, namesOf });
  } catch (error) {
    console.log(`REFUSED — ${errorText(error)}`);
    process.exit(1);
  }
  const { beat, model, staged, format } = loaded;
  const SIZE = exportSizeFromArgv();
  const FRAME = directedFrame(SIZE);
  assertBeatMayEnter(here, SIZE, { what: basename(here) });
  const titles = [beat.title].flat();
  const limits = [beat.limits].flat();
  const notes = staged.scheduled.plan.map((p) => p.note ?? p.label ?? "").join(" ");
  const textPerRegister = {
    display: titles.join(" "),
    eyebrow: beat.eyebrow,
    body: `${limits.join(" ")} ${beat.source}`,
    axis: staged.marks.map((m) => m.name).join(" "),
    annot: notes,
    value: staged.marks.map((m) => format(m.value)).join(" "),
  };
  const { label, direction } = pickDirection(here, plainRegisters(textPerRegister), beat.evidenceLevels ?? 2);
  console.log(`  ${staged.marks.length} marks · gestures: ${staged.valid.map((g) => g.do).join(", ")}`);
  const out = join(here, "renders");
  const name = nameAtSize(label, SIZE);
  try {
    await renderStill({
      element: createElement(Component, {
        variant,
        frame: { width: FRAME.width, height: FRAME.height },
        model,
        plan: staged.scheduled.plan,
        state: staged.scheduled.state,
        format,
        direction,
        eyebrow: beat.eyebrow,
        title: titles,
        limits,
        source: beat.source,
        alt: typeof beat.alt === "function" ? beat.alt(staged.marks) : beat.alt,
      }),
      width: FRAME.width,
      height: FRAME.height,
      outDir: out,
      name,
      scale: FRAME.scale,
    });
  } catch (error) {
    for (const ext of ["png", "svg"]) await rm(join(out, `${name}.${ext}`), { force: true });
    console.log(`REFUSED — ${errorText(error)}`);
    process.exit(1);
  }
  console.log(`rendered renders/${name}.png`);
  console.log(`look at: ${join(out, `${name}.png`)}`);
}

/** The registers as numbers (an SVG scene's words), the colours, and the measurers, for the run's direction. */
async function plateKit(direction) {
  const { measureText } = await import("#shared/chart-beat/render-still.mjs");
  const { keyedColoursOf, registersOf } = await import("./GestureKeyedStatic.tsx");
  const { measurers } = await import("./GestureKeyedPlate.tsx");
  const regs = registersOf(direction);
  return { regs, colours: keyedColoursOf(direction), ...measurers(regs, measureText) };
}

/**
 * A web kit's whole run: load, stage (resting state + one control per further gesture), lay the family's scene out
 * once on a nominal plot, render the page through chart-web's renderWeb against the generated declaration, verify it
 * in Chrome (verify-web), keep the desktop screenshot, print `look at:`.
 */
export async function runKeyedWeb({ here, spec, Component, variant, required, modelOf, namesOf, plotOf }) {
  const { chartWeb, plain, refusing, renderBeatWeb, storyLanguage } = await import("./web.mjs");
  const { keyedInteractionPlan } = await import("./gesture-keyed.mjs");
  await refusing(here, async () => {
    const { renderWeb } = await import(chartWeb(here, "scripts", "render-web.mjs"));
    const { beat, model, staged, format } = await loadKeyed({ here, spec, format: "web", required: [...required, "restLabel"], modelOf, namesOf });
    if (!String(beat.restLabel).trim()) throw new Error('beat.mjs: restLabel is empty: give the words of the option that shows the page as it lands, e.g. "The chart as it lands"');
    const { scheduled, marks, valid } = staged;
    const title = plain([beat.title].flat()[0]);
    const restingNotes = scheduled.plan.filter((p) => scheduled.restingIdx.includes(p.k) && p.note !== undefined && !["compare", "bracket", "reference"].includes(p.do)).map((p) => plain(p.note));
    const controls = scheduled.controls.map((c) => {
      const chip = plain(c.chip);
      const note = [c.note, ...c.pieces].filter(Boolean).map(plain).join(" · ");
      return { index: c.index, do: c.do, atom: c.atom, legend: plain(c.legend), chip, note, announce: `${chip} — ${note}`, state: c.state, question: c.question, changes: c.changes, parameter: c.parameter };
    });
    const subject = staged.scheduled.plan.flatMap((p) => p.own)[0] ?? marks[0].name;
    const interaction = keyedInteractionPlan({ scheduled: { controls }, marks, subject, what: spec.what ?? "mark" });
    const textPerRegister = {
      display: title,
      eyebrow: plain(beat.eyebrow),
      body: `${plain([beat.limits].flat()[0])} ${restingNotes.join(" ")} ${plain(beat.restLabel)} ${controls.map((c) => `${c.legend} ${c.chip} ${c.note}`).join(" ")} ${plain(beat.source)}`,
      axis: marks.map((m) => m.name).join(" "),
      annot: scheduled.plan.map((p) => p.note ?? p.label ?? "").join(" "),
      value: marks.map((m) => format(m.value)).join(" "),
    };
    console.log(`  ${marks.length} marks · resting: ${valid.filter((_, i) => scheduled.restingIdx.includes(i)).map((g) => g.do).join(", ") || "—"} · controls: ${controls.map((c) => `${c.do} (${c.atom})`).join(", ")}`);
    await renderBeatWeb({
      here,
      textPerRegister,
      evidenceLevels: beat.evidenceLevels ?? 2,
      async render({ label, direction, outDir }) {
        const kit = await plateKit(direction);
        const box = plotOf ? plotOf(model, kit) : { width: 900, height: 520 };
        const scene = spec.scene(model, { plan: scheduled.plan, box, measure: kit.measure, lead: kit.lead, format, variant });
        const { outPath } = await renderWeb({
          lang: beat.lang ?? storyLanguage(here) ?? "en",
          component: Component,
          props: {
            variant,
            scene,
            resting: scheduled.resting,
            controls,
            colours: kit.colours,
            svgRegs: kit.regs,
            restLabel: plain(beat.restLabel),
            restNotes: restingNotes,
            title,
            eyebrow: plain(beat.eyebrow),
            caveat: plain([beat.limits].flat()[0]),
            source: plain(beat.source),
            alt: plain(typeof beat.alt === "function" ? beat.alt(marks) : beat.alt),
            interaction,
            direction,
            ground: direction.ground,
            accent: direction.accent,
          },
          outDir,
          name: `${label}.html`,
        });
        return { outPath };
      },
    });
  });
}

/**
 * A video kit's whole run: load, stage three gestures into the six events, lay the family's scene out on the frame's
 * plot (registers at the video size, every word measured as the composition's width agreement reads it), the title
 * card and the credit from the chart-video skill's shots, the type floor at every event's end, the look stills, the
 * mp4 (`renderBeatVideo`). `--look-only` stops after the stills.
 */
export async function runKeyedVideo({ here, spec, Frame, variant, required, modelOf, namesOf, composition, timing }) {
  const { videoExportSize, sizeFor, frameInsetFor } = await import("#shared/chart-video/sizes.mjs");
  const { adjustToContrast, TEXT_CONTRAST_MIN } = await import("#shared/chart-beat/colour.mjs");
  const { EYEBROW_TO_DISPLAY, registerOf } = await import("#shared/design-base/register.mjs");
  const { resolveDirectionFamilies } = await import("#shared/design-base/resolve-families.mjs");
  const { skillScriptFrom } = await import("#shared/design-base/skill-script.mjs");
  const { assertEventFramesReadable, pickDirection, plain, refusing, renderBeatVideo } = await import("./video.mjs");
  const { keyedColoursOf } = await import("./GestureKeyedStatic.tsx");
  const { KEYED_EVENTS } = await import("./gesture-keyed.mjs");
  await refusing(here, async () => {
    const SIZE = videoExportSize();
    const { beat, model, staged, format } = await loadKeyed({ here, spec, format: "video", required, modelOf, namesOf });
    const chartVideo = (...p) => skillScriptFrom(here, "chart-video", "scripts", ...p);
    const { applyCase } = await import(chartVideo("registers.mjs"));
    const { CREDIT_ONE_LINE, CREDIT_MAX_LINES, sourceCreditFor, titleCardFor, verticalInsetFor, widthOf } = await import(chartVideo("shots.mjs"));
    const { videoRegistersOf } = await import(chartVideo("video-registers.mjs"));
    const { assertEventStates } = await import(chartVideo("choreography.mjs"));
    const { wantedOf } = await import(chartVideo("video-faces.mjs"));
    const title = plain([beat.title].flat()[0]);
    const source = [beat.source].flat().map(plain);
    const eyebrow = plain(beat.eyebrow);
    const { scheduled, marks } = staged;
    const words = scheduled.plan.map((p) => p.note ?? p.label ?? "").join(" ");
    const textPerRegister = { display: title, eyebrow, body: source.join(" "), annot: words || marks.map((m) => m.name).join(" "), value: `${marks.map((m) => format(m.value)).join(" ")} 0123456789`, axis: `${marks.map((m) => m.name).join(" ")} ${source.join(" ")}` };
    const { label, chosen } = pickDirection(here, textPerRegister, beat.evidenceLevels ?? 2);
    const direction = resolveDirectionFamilies(chosen, textPerRegister);
    const resolved = Object.fromEntries(["display", "eyebrow", "body", "annot", "value", "axis"].map((n) => [n, registerOf(direction, n)]));
    const registers = videoRegistersOf(resolved, SIZE);
    const k = registers.axis.fontSize / resolved.axis.fontSize;
    const row = sizeFor(SIZE);
    const inset = frameInsetFor(SIZE);
    const vInset = verticalInsetFor(SIZE);
    let titleCard;
    try {
      titleCard = titleCardFor({ registers, eyebrow, title: [title], size: SIZE, eyebrowToDisplay: EYEBROW_TO_DISPLAY });
    } catch (error) {
      throw new Error(`${error.message} — the title is the journalist's takeaway and must hold on the card`);
    }
    let credit;
    try {
      credit = sourceCreditFor({ registers, forms: source, size: SIZE, k, ...CREDIT_ONE_LINE });
    } catch {
      credit = sourceCreditFor({ registers, forms: source, size: SIZE, k, measure: 1, maxLines: CREDIT_MAX_LINES });
    }
    const { register: sourceRegister, ...creditBlock } = credit;
    const creditAt = { x: inset, y: row.height - vInset - creditBlock.height };
    const measure = (t, r) => widthOf(applyCase(String(t), (registers[r] ?? registers.axis).transform), registers[r] ?? registers.axis);
    const lead = (r) => (registers[r] ?? registers.axis).lead;
    const plotTop = vInset + lead("annot") * 1.4;
    const box = { width: row.width - 2 * inset, height: creditAt.y - lead("axis") * 1.5 - plotTop };
    const probe = spec.scene(model, { plan: scheduled.plan, box, measure, lead, format, variant });
    const scene = probe.topRoom ? spec.scene(model, { plan: scheduled.plan, box: { ...box, height: box.height - probe.topRoom }, measure, lead, format, variant }) : probe;
    const colours = keyedColoursOf(direction);
    const text = (c) => adjustToContrast(c, direction.ground, TEXT_CONTRAST_MIN) ?? c;
    assertEventStates(scheduled.states, [...KEYED_EVENTS]);
    const props = {
      frame: { width: row.width, height: row.height },
      registers: { display: titleCard.register, eyebrow: registers.eyebrow, value: registers.value, axis: registers.axis, annot: registers.annot, body: registers.body, source: sourceRegister, ...Object.fromEntries(["axis", "annot", "value"].map((n) => [`${n}Strong`, { ...registers[n], fontWeight: 700 }])) },
      titleCard,
      credit: { ...creditBlock, at: creditAt },
      colours,
      titleInk: { eyebrow: text(registers.eyebrow.fill ?? direction.accent), title: text(registers.display.fill ?? colours.text.ink) },
      scene,
      plotAt: { x: inset, y: plotTop + (scene.topRoom ?? 0) },
      states: scheduled.states,
      timing,
    };
    console.log(`direction ${label}`);
    console.log(`  ${marks.length} marks · gestures: ${scheduled.plan.map((p, i) => `${KEYED_EVENTS[i + 2]} ${p.do}${p.own.length ? ` ${p.own.slice(0, 3).join(", ")}${p.own.length > 3 ? "…" : ""}` : ""}`).join(" · ")}`);
    assertEventFramesReadable(Frame, props, SIZE, label);
    const T = timing;
    const end = (e) => T[e].start + T[e].duration - 1;
    const mid = (e) => Math.round(T[e].start + T[e].duration * 0.5);
    const lookFrames = [
      { name: "end-establish", frame: end("establish") },
      { name: "end-reference", frame: end("reference") },
      { name: `reveal-${scheduled.plan[0].do}`, frame: mid("reveal") },
      { name: "end-subject", frame: end("subject") },
      { name: "final", frame: T.total - 1 },
    ];
    await renderBeatVideo({
      Frame,
      here,
      label: SIZE === "landscape" ? label : `${label}-${SIZE}`,
      composition: `${composition}-${SIZE}`,
      size: SIZE,
      props,
      wanted: wantedOf(props.registers),
      lookFrames,
      lookOnly: process.argv.includes("--look-only"),
    });
  });
}

/**
 * A scrolly kit's whole run: load, stage one card per gesture (every card's words checked against its picture), lay
 * the family's scene out once, render the page through the scrolly skill's renderScrolly with the keyed drive inlined,
 * verify it (verify-scrolly), one screenshot per card, print `look at:`.
 */
export async function runKeyedScrolly({ here, spec, Component, variant, required, modelOf, namesOf, plotOf }) {
  const { plain, refusing, storyLanguage } = await import("./web.mjs");
  const { renderBeatScrolly, scrollySkill } = await import("./scrolly.mjs");
  const { createElement } = await import("react");
  const { webRegisters } = await import("#shared/design-base/web.mjs");
  const { EYEBROW_TO_DISPLAY, gapOf, registerOf } = await import("#shared/design-base/register.mjs");
  const { KEYED_APPLY, keyedDriveSource } = await import("./gesture-keyed.mjs");
  await refusing(here, async () => {
    const { renderScrolly } = await import(scrollySkill(here, "scripts", "render-scrolly.mjs"));
    const { beat, model, staged, format } = await loadKeyed({ here, spec, format: "scrolly", required, modelOf, namesOf });
    const { scheduled, cards, marks } = staged;
    const titleForms = [beat.title].flat().map(plain);
    const prose = [...cards.map((c) => c.prose.map(plain)), [plain([beat.limits].flat()[0])]];
    const steps = [...cards.map((c) => c.id), "limits"];
    const eyebrow = plain(beat.eyebrow);
    const source = plain(beat.source);
    const alt = plain(typeof beat.alt === "function" ? beat.alt(marks) : beat.alt);
    const textPerRegister = {
      display: titleForms.join(" "),
      eyebrow,
      body: `${prose.flat().join(" ")} ${source}`,
      axis: marks.map((m) => m.name).join(" "),
      annot: scheduled.plan.map((p) => p.note ?? p.label ?? "").join(" "),
      value: marks.map((m) => format(m.value)).join(" "),
    };
    console.log(`  ${marks.length} marks · cards: ${steps.join(" · ")}`);
    await renderBeatScrolly({
      here,
      states: scheduled.states,
      textPerRegister,
      evidenceLevels: beat.evidenceLevels ?? 2,
      async render({ label, direction, outDir }) {
        const kit = await plateKit(direction);
        const regs = webRegisters(direction, { ink: { ink: kit.colours.text.ink, muted: kit.colours.text.muted, accent: direction.accent } });
        const box = plotOf ? plotOf(model, kit) : { width: 900, height: 560 };
        const scene = spec.scene(model, { plan: scheduled.plan, box, measure: kit.measure, lead: kit.lead, format, variant });
        const { outPath } = await renderScrolly({
          steps: prose.map((p, i) => ({ id: steps[i], prose: p })),
          reveal: {
            element: createElement(Component, { variant, scene, still: scheduled.states.at(-1), colours: kit.colours, svgRegs: kit.regs, alt }),
            states: scheduled.states,
            driver: keyedDriveSource(),
            apply: KEYED_APPLY,
          },
          title: titleForms,
          eyebrow,
          source,
          ground: direction.ground,
          type: { eyebrow: { ...regs.eyebrow, marginBottom: `${gapOf(registerOf(direction, "eyebrow"), EYEBROW_TO_DISPLAY)}px` }, display: regs.display, body: regs.body, source: regs.body },
          lang: beat.lang ?? storyLanguage(here) ?? "en",
          outDir,
          name: `${label}.html`,
        });
        return { outPath };
      },
    });
  });
}
