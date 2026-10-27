// The generic half of every XY GESTURE beat (scatter-and-bubble, connected-scatter), one runner per format: the
// per-type kits' runners with their fixed staging replaced by the beat's `gestures`. Guard order, every format:
// importBeat → applyStoryboard → REQUIRED and the marks (prepareXY) → the values → check() and the shared guards →
// the gesture core (validateGestures, family "xy", the family's hooks, claim read from STORYBOARD.md with facts) →
// the format's scheduler → render → verify → `look at:`. A gesture refusal prints REFUSED with the beat.mjs field and
// a value that works; with SPLASH_GESTURE_REPAIR=1 the refusal's fix is applied instead ("REPAIRED gestures: <field>
// → <fix>") and the list staged again, at most 12 times. Nothing here refuses the data's SHAPE (point count, long
// names, negative values, a log axis over a zero, rows with a gap): the plate adapts and states what it left out.
//
// Runs in Bun only (Node modules). Each kit's render-beat.mjs is two lines: import this, call its format's runner
// with the variant.
import { existsSync, readFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { basename, join } from "node:path";
import { createElement } from "react";
import { GestureRefusal } from "./gesture-core.mjs";
import { prepareXY, refusalText, stageXY, ticksOf } from "./gesture-family-xy.mjs";
import { applyStoryboard, assertDrawsClaimColumn, assertHeadlineNumbersDrawn, assertNoAggregates, assertNumbers, errorText, importBeat, rowFacts, runCheck } from "./guards.mjs";

export const REPAIR = () => process.env.SPLASH_GESTURE_REPAIR === "1";

/** STORYBOARD.md's front matter, two levels above the beat. */
export function frontOf(here) {
  const file = join(here, "..", "..", "STORYBOARD.md");
  const text = existsSync(file) ? readFileSync(file, "utf8").split("---")[1] ?? "" : "";
  return (key) => text.match(new RegExp(`^${key}:\\s*"?(.*?)"?\\s*$`, "m"))?.[1]?.replace(/\\"/g, '"');
}

export function claimOf(here, takeawayFallback, unit) {
  const front = frontOf(here);
  return {
    takeaway: front("takeaway") ?? takeawayFallback,
    subject: front("subject"),
    comparison: front("comparison"),
    entity: front("claimEntity"),
    versus: front("claimVersus"),
    facts: rowFacts(here),
    unit,
  };
}

const REQUIRED = ["eyebrow", "rows", "gestures", "xName", "yName", "format", "xFormat", "title", "limits", "source", "alt", "check"];

/** Everything every format does before its scheduler: the beat, the marks, the guards, the claim. */
export async function openBeat(here, variant, extra = []) {
  const beat = await importBeat(here);
  applyStoryboard(beat, here);
  const { marks, dropped, xy } = prepareXY(beat, variant, [...REQUIRED, ...extra]);
  assertNumbers(marks.flatMap((m) => [[`${m.name}.x`, m.x], [`${m.name}.value`, m.value]]), "rows");
  runCheck(beat);
  const ys = marks.map((m) => m.value);
  try {
    assertDrawsClaimColumn(ys, here);
  } catch (yError) {
    try {
      assertDrawsClaimColumn(marks.map((m) => m.x), here);
    } catch {
      throw yError;
    }
  }
  assertNoAggregates(xy.heads.map((n) => xy.byName.get(n).series ?? n), here);
  const titles = [beat.title].flat().map(String);
  const claim = claimOf(here, titles[0], beat.unit);
  return { beat, marks, dropped, xy, titles, claim };
}

/** The title's numbers must be ones the plate draws: a value, an x, or a figure a gesture derives. */
export function assertTitleDrawn(title, xy, valid) {
  assertHeadlineNumbersDrawn(title, [...xy.marks.map((m) => m.value), ...xy.marks.map((m) => m.x), ...valid.flatMap((g) => g.figures ?? [])], "points");
}

/** Stages with the repair loop, printing every repair; a refusal leaves as an Error carrying the fix's value. */
export function stageOrRefuse(input) {
  try {
    const staged = stageXY({ ...input, repair: REPAIR() });
    for (const r of staged.repairs) console.log(`REPAIRED gestures: ${r.field} → ${JSON.stringify(r.fix)}`);
    return staged;
  } catch (error) {
    if (!(error instanceof GestureRefusal)) throw error;
    throw new Error(refusalText(error));
  }
}

/** The line a plate prints when rows were left out for want of a number: never silent. */
export const droppedLine = (dropped, scope) => (dropped > 0 ? (typeof scope === "function" ? scope(dropped) : `${dropped} rows without both values are not drawn`) : null);

// ── static ────────────────────────────────────────────────────────────────────────────────────────

export async function runStatic(here, variant) {
  const { renderStill } = await import("#shared/chart-beat/render-still.mjs");
  const { readPalette } = await import("#shared/chart-beat/colour.mjs");
  const { composeDirections, filedDirections, report: composeReport, resolveDirectionFamilies } = await import("#shared/design-base/index.mjs");
  const { directionReachable, readRunDirection } = await import("#shared/design-base/run-direction.mjs");
  const { assertBeatMayEnter, directedFrame, exportSizeFromArgv, nameAtSize } = await import("#shared/chart-beat/directed-size.mjs");
  const { composeStaticXY } = await import("./gesture-xy-static.mjs");
  const { GestureXYStatic } = await import("./GestureXYStatic.tsx");
  const fail = (error) => {
    console.log(`REFUSED — ${errorText(error)}`);
    process.exit(1);
  };
  let opened;
  try {
    opened = await openBeat(here, variant);
  } catch (error) {
    fail(error);
  }
  const { beat, xy, dropped, titles, claim } = opened;
  const OUT = join(here, "renders");
  const SIZE = exportSizeFromArgv();
  const FRAME = directedFrame(SIZE);
  try {
    assertBeatMayEnter(here, SIZE, { what: basename(here) });
  } catch (error) {
    fail(error);
  }
  let staged;
  try {
    staged = stageOrRefuse({ gestures: beat.gestures, xy, format: "static", claim, schedule: (valid) => composeStaticXY({ gestures: valid, xy }) });
    assertTitleDrawn(titles[0], xy, staged.valid);
  } catch (error) {
    fail(error);
  }
  const plate = staged.scheduled;
  const limits = [beat.limits].flat().map(String);
  const notes = plate.picture.notes.map((n) => n.text ?? "").join(" ");
  const textPerRegister = {
    display: titles.join(" "),
    eyebrow: beat.eyebrow,
    body: `${limits.join(" ")} ${beat.source}`,
    axis: `${beat.xName} ${beat.xQualifier ?? ""} ${beat.yName} ${beat.yQualifier ?? ""} ${xy.marks.map((m) => `${beat.format(m.value)} ${(beat.xTick ?? beat.xFormat)(m.x)}`).slice(0, 40).join(" ")} ${xy.marks.map((m) => m.key ?? "").join(" ")} ${beat.sizeName ?? ""} 0123456789<`,
    annot: `${notes} ${xy.heads.map((n) => xy.byName.get(n).series ?? n).join(" ")} ${xy.marks.slice(0, 40).map((m) => `${beat.xFormat(m.x)} ${beat.format(m.value)}`).join(" ")} ·`,
    value: "",
  };
  const labelOf = (id) => id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  let chosen;
  if (directionReachable(here)) {
    const run = readRunDirection(here);
    chosen = { label: labelOf(run.id), direction: run };
  } else {
    const composition = composeDirections({ newsroom: readPalette(here), filed: filedDirections(), beat: { evidenceLevels: beat.evidenceLevels ?? 3 }, textPerRegister });
    if (!composition.offered.length) fail(new Error(`no composed direction holds up for this beat:\n${composeReport(composition, {})}`));
    chosen = { label: labelOf(composition.offered[0].id), direction: composition.offered[0] };
  }
  const direction = resolveDirectionFamilies(chosen.direction, textPerRegister);
  const name = nameAtSize(chosen.label, SIZE);
  let droppedLabels = [];
  try {
    await renderStill({
      element: createElement(GestureXYStatic, {
        frame: { width: FRAME.width, height: FRAME.height },
        variant,
        xy,
        plate,
        format: beat.format,
        xFormat: beat.xFormat,
        xTick: beat.xTick,
        xName: beat.xName,
        xQualifier: beat.xQualifier,
        yName: beat.yName,
        yQualifier: beat.yQualifier,
        sizeName: beat.sizeName,
        sizeFormat: beat.sizeFormat,
        title: titles,
        limits,
        source: beat.source,
        alt: typeof beat.alt === "function" ? beat.alt(xy.marks) : beat.alt,
        eyebrow: beat.eyebrow,
        scope: droppedLine(dropped, beat.scope),
        direction,
        onDropped: (ids) => (droppedLabels = ids),
      }),
      width: FRAME.width,
      height: FRAME.height,
      outDir: OUT,
      name,
      scale: FRAME.scale,
    });
    // A gesture's note that found no room is half a gesture: refused, naming it (a shorter note always fits better).
    const lost = droppedLabels.filter((id) => id.startsWith("note-") || id.startsWith("rule-"));
    if (lost.length) {
      const k = Number(lost[0].split("-")[1]);
      throw new Error(`gestures[${k}].note: the note of gestures[${k}] (${staged.valid[k].do}) could not be placed without covering a point or leaving the frame: shorten it`);
    }
    console.log(`  gestures: ${staged.valid.map((g) => `${g.do}${g.marks.length ? ` ${g.marks.slice(0, 3).join(", ")}${g.marks.length > 3 ? "…" : ""}` : ""}`).join(" · ")}`);
    console.log(`rendered renders/${name}.png`);
    console.log(`look at: ${join(OUT, `${name}.png`)}`);
  } catch (error) {
    for (const ext of ["png", "svg"]) await rm(join(OUT, `${name}.${ext}`), { force: true });
    fail(error);
  }
}

// ── web ───────────────────────────────────────────────────────────────────────────────────────────

/** Every mark's answer to a pointer: its name, x and y (and size), unique per mark. */
export function detailsOf(beat, xy, plain = String) {
  const out = {};
  for (const m of xy.marks) {
    const label = m.series !== undefined ? `${m.series} ${m.key}` : m.name;
    const size = m.size !== undefined && beat.sizeName ? ` · ${beat.sizeName} ${beat.sizeFormat ? beat.sizeFormat(m.size) : m.size}` : "";
    out[m.name] = plain(`${label} · ${beat.xName} ${beat.xFormat(m.x)} · ${beat.yName} ${beat.format(m.value)}${size}`);
  }
  return out;
}

export async function runWeb(here, variant) {
  const { webRegisters } = await import("#shared/design-base/web.mjs");
  const { chartWeb, plain, refusing, renderBeatWeb, storyLanguage } = await import("./web.mjs");
  const { scheduleWebXY, interactionPlanXY } = await import("./gesture-xy-web.mjs");
  const { GestureXYWeb } = await import("./GestureXYWeb.tsx");
  await refusing(here, async () => {
    const { beat, xy, dropped, titles, claim } = await openBeat(here, variant, ["restLabel"]);
    const { renderWeb } = await import(chartWeb(here, "scripts", "render-web.mjs"));
    const { deriveFurniture } = await import(chartWeb(here, "scripts", "render-still.mjs"));
    const format = (v) => plain(beat.format(v));
    const xFormat = (v) => plain(beat.xFormat(v));
    const xTick = (v) => plain((beat.xTick ?? beat.xFormat)(v));
    const staged = stageOrRefuse({ gestures: beat.gestures, xy, format: "web", claim, schedule: (valid) => scheduleWebXY({ gestures: valid, xy, format, xFormat }) });
    const title = plain(titles[0]);
    assertTitleDrawn(title, xy, staged.valid);
    const scheduled = staged.scheduled;
    const subject = scheduled.accentMark ?? staged.entities[0] ?? xy.heads[0];
    const interaction = interactionPlanXY({ scheduled, xy, subject });
    for (const c of scheduled.controls) {
      c.legend = plain(c.label ?? c.legend);
      c.chip = plain(c.chip);
      c.text = [c.note, ...c.pieces].filter(Boolean).map(plain).join(" · ");
      c.announce = `${c.chip} — ${c.text}`;
    }
    const restNotes = scheduled.resting.notes
      .filter((n) => scheduled.restingIdx.includes(n.k) && n.text !== undefined)
      .map((n) => {
        const name = n.mark ? xy.byName.get(n.mark).series ?? n.mark : null;
        return plain(name && !n.text.includes(name) ? `${name}: ${n.text}` : n.text);
      });
    const details = detailsOf(beat, xy, plain);
    const eyebrow = plain(beat.eyebrow);
    const caveat = plain([beat.limits].flat()[0]);
    const source = plain(beat.source);
    const alt = plain(typeof beat.alt === "function" ? beat.alt(xy.marks) : beat.alt);
    const restLabel = plain(beat.restLabel);
    const restLine = droppedLine(dropped, beat.scope);
    const words = [
      ...scheduled.resting.notes.map((n) => n.text ?? ""),
      ...xy.heads.map((n) => xy.byName.get(n).series ?? n),
      ...xy.marks.map((m) => `${format(m.value)} ${xTick(m.x)} ${m.key ?? ""}`),
    ].map(plain);
    const textPerRegister = {
      display: title,
      eyebrow,
      body: `${caveat} ${restNotes.join(" ")} ${restLabel} ${scheduled.controls.map((c) => `${c.legend} ${c.chip} ${c.text}`).join(" ")} ${source} ${restLine ?? ""} ${Object.values(details).join(" ")}`,
      axis: `${plain(beat.xName)} ${plain(beat.yName)} ${words.slice(-60).join(" ")}`,
      annot: words.join(" "),
      value: "",
    };
    console.log(`  ${xy.marks.length} marks · resting: ${scheduled.restingIdx.map((k) => staged.valid[k].do).join(", ") || "—"} · controls: ${scheduled.controls.map((c) => `${c.do} (${c.atom})`).join(", ")}`);
    const lang = beat.lang ?? storyLanguage(here) ?? "en";
    await renderBeatWeb({
      here,
      textPerRegister,
      evidenceLevels: beat.evidenceLevels ?? 3,
      async render({ label, direction, outDir }) {
        const furniture = deriveFurniture(direction.ground);
        const { outPath } = await renderWeb({
          lang,
          component: GestureXYWeb,
          props: {
            variant,
            xy,
            scheduled,
            details,
            format,
            xFormat,
            xTick,
            xName: plain(`${beat.xName}${beat.xQualifier ? ` ${beat.xQualifier}` : ""}`),
            yName: plain(`${beat.yName}${beat.yQualifier ? ` ${beat.yQualifier}` : ""}`),
            restLabel,
            restNotes,
            restLine,
            title,
            eyebrow,
            caveat,
            source,
            alt,
            interaction,
            direction,
            ground: direction.ground,
            accent: direction.accent,
            ...furniture,
          },
          outDir,
          name: `${label}.html`,
        });
        void webRegisters;
        return { outPath };
      },
    });
  });
}

// ── video ─────────────────────────────────────────────────────────────────────────────────────────

/** Everything one XY gesture video is handed, built in Bun: every word measured, the plot laid out, the states. */
export async function buildVideoXY({ here, chosen, beat, xy, valid, scheduled, size, title, plain }) {
  const { adjustToContrast, mix, NON_TEXT_CONTRAST_MIN, TEXT_CONTRAST_MIN } = await import("#shared/chart-beat/colour.mjs");
  const { deriveFurniture } = await import("#shared/chart-beat/render-still.mjs");
  const { frameInsetFor, sizeFor } = await import("#shared/chart-video/sizes.mjs");
  const { EYEBROW_TO_DISPLAY, registerOf } = await import("#shared/design-base/register.mjs");
  const { resolveDirectionFamilies } = await import("#shared/design-base/resolve-families.mjs");
  const { skillScriptFrom } = await import("#shared/design-base/skill-script.mjs");
  const chartVideo = (...parts) => skillScriptFrom(here, "chart-video", "scripts", ...parts);
  const { applyCase } = await import(chartVideo("registers.mjs"));
  const { BAND_PROBE, bandOf, cardTextFor, CREDIT_MAX_LINES, CREDIT_ONE_LINE, DRAWN_WIDER, haloOf, sourceCreditFor, titleCardFor, verticalInsetFor, widthOf, wrap } = await import(chartVideo("shots.mjs"));
  const { videoRegistersOf } = await import(chartVideo("video-registers.mjs"));
  const { assertEventStates } = await import(chartVideo("choreography.mjs"));
  const { ticksOf } = await import("./gesture-family-xy.mjs");
  const { EVENTS } = await import("./gesture-xy-video.mjs");
  const { GESTURE_VIDEO_TIMING } = await import(join(here, "timing-contract.ts"));

  const format = (v) => plain(beat.format(v));
  const xTick = (v) => plain((beat.xTick ?? beat.xFormat)(v));
  const notes = valid.map((g) => g.note).filter(Boolean).map(plain);
  const textPerRegister = {
    display: title,
    eyebrow: plain(beat.eyebrow),
    body: [beat.source].flat().map(plain).join(" "),
    annot: `${notes.join(" ")} ${xy.heads.map((n) => xy.byName.get(n).series ?? n).join(" ")}`,
    value: "0123456789",
    axis: `${plain(beat.xName)} ${plain(beat.yName)} ${xy.marks.slice(0, 60).map((m) => `${format(m.value)} ${xTick(m.x)} ${m.key ?? ""}`).join(" ")}`,
  };
  const direction = resolveDirectionFamilies(chosen, textPerRegister);
  const resolved = Object.fromEntries(["display", "eyebrow", "body", "annot", "value", "axis"].map((name) => [name, registerOf(direction, name)]));
  const registers = videoRegistersOf(resolved, size);
  const k = registers.axis.fontSize / resolved.axis.fontSize;
  const row = sizeFor(size);
  const stage = { width: row.width, height: row.height };
  const { axis, annot } = registers;
  const inset = frameInsetFor(size);
  const vInset = verticalInsetFor(size);
  const content = { left: inset, right: stage.width - inset, width: stage.width - 2 * inset };
  const gap = 0.4 * axis.lead;
  const band = (r) => bandOf(BAND_PROBE, r);
  const measured = (text, r) => {
    const t = applyCase(text, r.transform);
    return { text: t, width: widthOf(t, r) };
  };

  let titleCard;
  try {
    titleCard = titleCardFor({ registers, eyebrow: plain(beat.eyebrow), title: [title], size, eyebrowToDisplay: EYEBROW_TO_DISPLAY });
  } catch {
    const measure = content.width / (1 + DRAWN_WIDER);
    const card = cardTextFor([title], registers, { measure, maxLines: 6 });
    const eb = band(registers.eyebrow);
    const tb = band(card.register);
    const eyebrowText = applyCase(plain(beat.eyebrow), registers.eyebrow.transform);
    const top = Math.round((stage.height - (eb.ascent + eb.descent + EYEBROW_TO_DISPLAY * registers.eyebrow.lead + tb.ascent + (card.lines.length - 1) * card.register.lead + tb.descent)) / 2);
    const first = top + eb.ascent + eb.descent + EYEBROW_TO_DISPLAY * registers.eyebrow.lead + tb.ascent;
    titleCard = {
      form: 0,
      register: card.register,
      eyebrow: { text: eyebrowText, x: inset, y: top + eb.ascent, width: widthOf(eyebrowText, registers.eyebrow) },
      title: card.lines.map((l, i) => ({ text: l.text, x: inset, y: first + i * card.register.lead, width: l.width })),
    };
  }
  let creditBlock;
  const forms = [beat.source].flat().map(plain);
  try {
    creditBlock = sourceCreditFor({ registers, forms, size, k, ...CREDIT_ONE_LINE });
  } catch {
    creditBlock = sourceCreditFor({ registers, forms, size, k, measure: 1, maxLines: CREDIT_MAX_LINES });
  }
  const { register: sourceRegister, ...credit } = creditBlock;
  const creditAt = { x: inset, y: stage.height - vInset - credit.height };

  // ── caption lines at the top: each gesture's note (a zoom's factor among them), arriving with its gesture
  const captions = [];
  let y = vInset;
  const bAnnot = band(annot);
  for (const p of scheduled.plan) {
    if (p.note === undefined) continue;
    const name = p.at ? xy.byName.get(p.at).series ?? p.at : null;
    const text = plain(name && !p.note.includes(name) ? `${name}: ${p.note}` : p.note);
    const lines = wrap(applyCase(text, annot.transform), annot, content.width / (1 + DRAWN_WIDER)).map((l, j) => ({ ...l, x: content.left, y: y + bAnnot.ascent + j * annot.lead }));
    captions.push({ k: p.k, lines });
    y += lines.length * annot.lead;
  }
  const bAxis = band(axis);
  const yName = measured(plain(`${beat.yName}${beat.yQualifier ? ` ${beat.yQualifier}` : ""}`), axis);
  const yNameY = y + gap + bAxis.ascent;
  const plotTop = yNameY + bAxis.descent + gap * 2;
  const xName = measured(plain(`${beat.xName}${beat.xQualifier ? ` ${beat.xQualifier}` : ""}`), axis);
  const scope = droppedLine(beat.droppedCount ?? 0, beat.scope);
  const xNameY = creditAt.y - gap * 1.5 - (scope ? axis.lead : 0) - bAxis.descent;
  const xTickY = bAxis.ascent + gap;
  const plotBottom = xNameY - bAxis.ascent - gap - (xTickY + bAxis.descent) - gap;

  const tickSet = (dom) => {
    const t = ticksOf(xy, dom);
    return { dom, x: t.x.map((v) => ({ v, ...measured(xTick(v), axis) })), y: t.y.map((v) => ({ v, ...measured(format(v), axis) })) };
  };
  const tickSets = [tickSet(xy.full), ...scheduled.plan.filter((p) => p.do === "zoom").map((p) => tickSet(p.dom))];
  const yTickW = Math.max(...tickSets.flatMap((t) => t.y.map((q) => q.width)));
  const plot = { left: content.left + yTickW + gap * 1.5, right: content.right, top: plotTop, bottom: plotBottom };
  if (!(plot.bottom - plot.top > stage.height * 0.25)) throw new Error(`the notes leave the plot ${Math.round(plot.bottom - plot.top)}px of ${stage.height}: shorten the gestures' notes`);

  // ── words on the plot: a tag per mark a gesture names (and the subject), a rule's value, a trace's keys
  const tagged = new Map();
  const tagOf = (mark, k) => {
    const head = xy.pathOf(mark).at(-1);
    if (!tagged.has(head)) tagged.set(head, { mark: head, items: [], ...measured(plain(xy.byName.get(head).series ?? head), annot) });
    if (k !== undefined) tagged.get(head).items.push(k);
  };
  if (scheduled.accentMark) tagOf(scheduled.accentMark);
  for (const p of scheduled.plan) {
    if (["highlight", "name", "annotate"].includes(p.do) || p.at) for (const m of p.marks) tagOf(m, p.k);
    if (p.do === "compare") [p.a, p.b].forEach((m) => tagOf(m, p.k));
  }
  const ruleLabels = Object.fromEntries(scheduled.plan.filter((p) => p.do === "reference" || (p.do === "filter" && p.axis)).map((p) => [p.k, measured(p.axis === "x" ? xTick(p.value) : format(p.value), annot)]));
  const keyTags = scheduled.plan.filter((p) => p.do === "trace").flatMap((p) => p.series.flatMap((s) => {
    const names = xy.paths.get(s);
    return [names[0], names.at(-1)].map((n) => ({ series: s, mark: n, ...measured(String(xy.byName.get(n).key), axis) }));
  }));

  assertEventStates(scheduled.states, [...EVENTS]);
  const { ground, accent } = direction;
  const { ink, muted, grid } = deriveFurniture(ground);
  const walked = (col, floor, what) => {
    const w = adjustToContrast(col, ground, floor);
    if (!w) throw new Error(`${what} has no variant that reads at ${floor}:1 on ${ground}`);
    return w;
  };
  const colours = {
    ground,
    grid,
    ink: walked(ink, TEXT_CONTRAST_MIN, "ink"),
    neutral: walked(mix(ground, ink, 0.42), NON_TEXT_CONTRAST_MIN, "a point"),
    accent: walked(accent, NON_TEXT_CONTRAST_MIN, "the accent"),
    rule: walked(muted, NON_TEXT_CONTRAST_MIN, "a reference rule"),
    ring: walked(ink, NON_TEXT_CONTRAST_MIN, "a ring"),
    text: {
      eyebrow: walked(registers.eyebrow.fill ?? accent, TEXT_CONTRAST_MIN, "the eyebrow"),
      title: walked(registers.display.fill ?? ink, TEXT_CONTRAST_MIN, "the title"),
      name: walked(ink, TEXT_CONTRAST_MIN, "a name"),
      axis: walked(muted, TEXT_CONTRAST_MIN, "a muted word"),
      first: walked(accent, TEXT_CONTRAST_MIN, "a highlighted word"),
    },
  };
  const sized = xy.variant === "scatter-and-bubble" && xy.marks.every((m) => m.size !== undefined);
  const heads = xy.heads;
  const revealOrder = [...heads].sort((a, b) => xy.byName.get(a).x - xy.byName.get(b).x);
  const props = {
    frame: stage,
    registers: { display: titleCard.register, eyebrow: registers.eyebrow, value: registers.value, axis, annot, source: sourceRegister },
    titleCard,
    credit: { ...credit, at: creditAt },
    colours,
    layout: {
      plot,
      gap,
      r: axis.fontSize * 0.28,
      rMax: Math.min(plot.right - plot.left, plot.bottom - plot.top) * 0.06,
      rFloor: axis.fontSize * 0.14,
      tickShift: (bAxis.ascent - bAxis.descent) / 2,
      xTickY,
      captions,
      yName: { ...yName, x: content.left, y: yNameY },
      xName: { ...xName, x: plot.left, y: xNameY },
      scope: scope ? { ...measured(plain(scope), axis), x: plot.left, y: xNameY + axis.lead } : null,
    },
    variant: xy.variant,
    marks: xy.marks,
    xLog: xy.log,
    extra: xy.extra,
    paths: [...xy.paths.entries()].map(([series, names]) => ({ series, names })),
    drawOrder: [...xy.marks].sort((a, b) => (b.size ?? 0) - (a.size ?? 0)).map((m) => m.name).sort((a, b) => Number(a === scheduled.accentMark) - Number(b === scheduled.accentMark)),
    sized,
    maxSize: sized ? Math.max(...xy.marks.map((m) => m.size)) : 1,
    plan: scheduled.plan,
    accentMark: scheduled.accentMark,
    ruleAccent: scheduled.accentMark === null,
    hasReveal: scheduled.plan.some((p) => p.do === "reveal"),
    revealOrder,
    states: scheduled.states,
    windows: scheduled.windows,
    linear: scheduled.linear,
    tickSets,
    tags: [...tagged.values()],
    ruleLabels,
    keyTags,
    strokes: { rule: (direction.stroke?.rule ?? 1) * k * 1.4, grid: (direction.stroke?.hairline ?? 0.6) * k, series: (direction.stroke?.series ?? 2.5) * k },
    dash: [0.2 * axis.lead, 0.14 * axis.lead],
    halo: { value: haloOf(registers.value, k), axis: haloOf(axis, k), annot: haloOf(annot, k) },
    timing: GESTURE_VIDEO_TIMING,
  };
  return { props, direction };
}

export async function runVideo(here, variant) {
  const { videoExportSize } = await import("#shared/chart-video/sizes.mjs");
  const { assertEventFramesReadable, pickDirection, plain, refusing, renderBeatVideo } = await import("./video.mjs");
  const { scheduleVideoXY } = await import("./gesture-xy-video.mjs");
  await refusing(here, async () => {
    const SIZE = videoExportSize();
    const { beat, xy, dropped, titles, claim } = await openBeat(here, variant);
    const title = plain(titles[0]);
    const COMPOSITION_BASE = `zone-video-${variant}-gestures`;
    const staged = stageOrRefuse({ gestures: beat.gestures, xy, format: "video", claim, schedule: (valid) => scheduleVideoXY({ gestures: valid, xy }) });
    assertTitleDrawn(title, xy, staged.valid);
    beat.droppedCount = dropped;
    const { label, chosen } = pickDirection(here, { display: title, eyebrow: plain(beat.eyebrow), body: [beat.source].flat().map(plain).join(" "), annot: staged.valid.map((g) => g.note ?? "").join(" "), value: "0123456789", axis: `${beat.xName} ${beat.yName}` }, beat.evidenceLevels ?? 3);
    const { props, direction } = await buildVideoXY({ here, chosen, beat, xy, valid: staged.valid, scheduled: staged.scheduled, size: SIZE, title, plain });
    console.log(`direction ${label}`);
    for (const d of direction.decisions ?? []) console.log(`  ${d.register.padEnd(8)} ${d.role.padEnd(15)} -> ${d.family}`);
    console.log(`  gestures: ${staged.scheduled.plan.map((p, k) => `${["reveal", "subject", "conclusion"][k]} ${p.do}${p.marks.length ? ` ${p.marks.slice(0, 3).join(", ")}` : ""}`).join(" · ")}`);
    const { GestureXYFrame } = await import("./GestureXYFrame.tsx");
    try {
      assertEventFramesReadable(GestureXYFrame, props, SIZE, label);
    } catch (error) {
      throw new Error(`${error.message} — shorten the words that frame draws (notes, the title, source forms)`);
    }
    const T = props.timing;
    const end = (e) => T[e].start + T[e].duration - 1;
    const mid = (e) => Math.round(T[e].start + T[e].duration * 0.5);
    const plan = staged.scheduled.plan;
    const lookFrames = [
      { name: "first", frame: 0 },
      { name: "end-reference", frame: end("reference") },
      { name: `reveal-${plan[0].do}`, frame: mid("reveal") },
      { name: "end-reveal", frame: end("reveal") },
      { name: `subject-${plan[1].do}`, frame: mid("subject") },
      { name: "end-subject", frame: end("subject") },
      { name: `conclusion-${plan[2].do}`, frame: mid("conclusion") },
      { name: "final", frame: T.total - 1 },
    ];
    const { wantedOf } = await import((await import("#shared/design-base/skill-script.mjs")).skillScriptFrom(here, "chart-video", "scripts", "video-faces.mjs"));
    await renderBeatVideo({
      Frame: GestureXYFrame,
      here,
      label: SIZE === "landscape" ? label : `${label}-${SIZE}`,
      composition: `${COMPOSITION_BASE}-${SIZE}`,
      size: SIZE,
      props,
      wanted: wantedOf(props.registers),
      lookFrames,
      lookOnly: process.argv.includes("--look-only"),
    });
  });
}

// ── scrolly ───────────────────────────────────────────────────────────────────────────────────────

/** What the scrolly drive reads (indices, not names) and the closing card's still, built from the schedule. */
export function scrollyDataXY({ xy, scheduled, format, xTick }) {
  const { plan, accentMark } = scheduled;
  const index = new Map(xy.marks.map((m, i) => [m.name, i]));
  const ix = (names) => [...new Set(names)].map((n) => index.get(n));
  const pathIndex = new Map([...xy.paths.keys()].map((s, j) => [s, j]));
  const accentSet = new Set(accentMark ? xy.pathOf(accentMark) : []);
  const sized = xy.variant === "scatter-and-bubble" && xy.marks.every((m) => m.size !== undefined);
  const effects = plan.map((p) => ({
    k: p.k,
    accent: ix(xy.reach(p.accent ?? [])),
    ring: ix(xy.reach([...(p.rings ?? []), ...(p.do === "compare" ? [p.a, p.b] : [])])),
    ...(p.do === "filter" ? { kept: ix(p.kept.flatMap((n) => xy.pathOf(n))) } : {}),
    ...(p.do === "trace" ? { traced: p.series.map((s) => pathIndex.get(s)) } : {}),
  }));
  const rules = plan.filter((p) => p.do === "reference" || (p.do === "filter" && p.axis)).filter((p, i, all) => all.findIndex((q) => q.axis === p.axis && q.value === p.value) === i).map((p) => ({ k: p.k, axis: p.axis, value: p.value, text: p.axis === "x" ? xTick(p.value) : format(p.value) }));
  const compares = plan.filter((p) => p.do === "compare").map((p) => ({ k: p.k, a: index.get(p.a), b: index.get(p.b) }));
  const tagged = new Map();
  const tagOf = (mark, k) => {
    const head = xy.pathOf(mark).at(-1);
    if (!tagged.has(head)) tagged.set(head, { mark: index.get(head), text: xy.byName.get(head).series ?? head, items: [] });
    if (k !== undefined) tagged.get(head).items.push(k);
  };
  if (accentMark) tagOf(accentMark);
  for (const p of plan) {
    if (["highlight", "name", "annotate"].includes(p.do) || p.at) for (const m of p.marks) tagOf(m, p.k);
    if (p.do === "compare") [p.a, p.b].forEach((m) => tagOf(m, p.k));
  }
  const tickSet = (dom) => {
    const t = ticksOf(xy, dom);
    return { span: dom.x[1] - dom.x[0], x: t.x.map((v) => ({ v, text: xTick(v) })), y: t.y.map((v) => ({ v, text: format(v) })) };
  };
  const tickSets = [tickSet(xy.full), ...plan.filter((p) => p.do === "zoom").map((p) => tickSet(p.dom))];
  const revealOrder = [...xy.heads].sort((a, b) => xy.byName.get(a).x - xy.byName.get(b).x).map((h) => ix(xy.pathOf(h)));
  const data = {
    log: xy.log,
    sized,
    maxSize: sized ? Math.max(...xy.marks.map((m) => m.size)) : 1,
    marks: xy.marks.map((m) => ({ x: m.x, y: m.value, ...(m.size !== undefined ? { s: m.size } : {}), ...(accentSet.has(m.name) ? { accent: 1 } : {}), ...(xy.variant === "connected-scatter" && xy.pathOf(m.name).at(-1) !== m.name ? { start: 1 } : {}) })),
    paths: [...xy.paths.values()].map((names) => ({ marks: ix(names) })),
    drawOrder: xy.marks.map((m, i) => i).sort((a, b) => Number(accentSet.has(xy.marks[a].name)) - Number(accentSet.has(xy.marks[b].name)) || (xy.marks[b].size ?? 0) - (xy.marks[a].size ?? 0)),
    effects,
    rules,
    ruleAccent: accentMark === null,
    compares,
    tags: [...tagged.values()],
    tickSets,
    revealOrder,
    reveal: plan.some((p) => p.do === "reveal"),
    notes: plan.map((p) => p.note ?? ""),
  };
  // The closing card's still, in a fixed 800 x 450 frame (the no-script picture).
  const SW = 800;
  const SH = 450;
  const P = (m) => ({ x: 60 + xy.u(m.x) * (SW - 66), y: 8 + (1 - xy.v(m.value)) * (SH - 34) });
  const ticks = ticksOf(xy);
  const still = {
    points: xy.marks.map((m) => ({ ...P(m), r: sized ? Math.max(1.5, 18 * Math.sqrt(m.size / data.maxSize)) : 4, accent: accentSet.has(m.name), hollow: xy.variant === "connected-scatter" && xy.pathOf(m.name).at(-1) !== m.name })),
    paths: [...xy.paths.values()].map((names) => names.map((n) => {
      const q = P(xy.byName.get(n));
      return `${q.x},${q.y}`;
    })),
    rules: rules.map((r) => ({ axis: r.axis, u: r.axis === "x" ? xy.u(r.value) : 0, v: r.axis === "y" ? xy.v(r.value) : 0 })),
    xTicks: ticks.x.filter((v) => xy.u(v) >= 0 && xy.u(v) <= 1).map((v) => ({ v, x: xy.u(v), text: xTick(v) })),
    yTicks: ticks.y.filter((v) => xy.v(v) >= 0 && xy.v(v) <= 1).map((v) => ({ v, y: 1 - xy.v(v), text: format(v) })),
  };
  return { data, still };
}

export async function runScrolly(here, variant) {
  const { deriveFurniture } = await import("#shared/chart-beat/render-still.mjs");
  const { webRegisters } = await import("#shared/design-base/web.mjs");
  const { EYEBROW_TO_DISPLAY, gapOf, registerOf } = await import("#shared/design-base/register.mjs");
  const { plain, refusing, storyLanguage } = await import("./web.mjs");
  const { renderBeatScrolly, scrollySkill } = await import("./scrolly.mjs");
  const { APPLY, checkCardsXY, driveSource, scheduleScrollyXY } = await import("./gesture-xy-scrolly.mjs");
  const { GestureXYScrolly } = await import("./GestureXYScrolly.tsx");
  await refusing(here, async () => {
    const { beat, xy, dropped, titles, claim } = await openBeat(here, variant);
    const { renderScrolly } = await import(scrollySkill(here, "scripts", "render-scrolly.mjs"));
    const format = (v) => plain(beat.format(v));
    const xTick = (v) => plain((beat.xTick ?? beat.xFormat)(v));
    const facts = claim.facts;
    const staged = stageOrRefuse({
      gestures: beat.gestures,
      xy,
      format: "scrolly",
      claim,
      schedule: (valid) => {
        const scheduled = scheduleScrollyXY({ gestures: valid, xy });
        const cards = checkCardsXY({ gestures: valid, xy, facts });
        return { ...scheduled, cards };
      },
    });
    const titleForms = titles.map(plain);
    assertTitleDrawn(titleForms[0], xy, staged.valid);
    const { cards, states } = staged.scheduled;
    const { data, still } = scrollyDataXY({ xy, scheduled: staged.scheduled, format, xTick });
    data.notes = data.notes.map(plain);
    const scope = droppedLine(dropped, beat.scope);
    const prose = [...cards.map((c) => c.prose.map(plain)), [plain([beat.limits].flat()[0]), ...(scope ? [plain(scope)] : [])]];
    const steps = [...cards.map((c) => c.id), "limits"];
    const eyebrow = plain(beat.eyebrow);
    const source = plain(beat.source);
    const alt = plain(typeof beat.alt === "function" ? beat.alt(xy.marks) : beat.alt);
    const yName = plain(`${beat.yName}${beat.yQualifier ? ` ${beat.yQualifier}` : ""}`);
    const xName = plain(`${beat.xName}${beat.xQualifier ? ` ${beat.xQualifier}` : ""}`);
    const textPerRegister = {
      display: titleForms.join(" "),
      eyebrow,
      body: `${prose.flat().join(" ")} ${source}`,
      axis: `${yName} ${xName} ${data.tickSets.flatMap((s) => [...s.x, ...s.y].map((t) => t.text)).join(" ")}`,
      annot: `${data.notes.join(" ")} ${data.tags.map((t) => t.text).join(" ")} ${data.rules.map((r) => r.text).join(" ")}`,
      value: "",
    };
    console.log(`  ${xy.marks.length} marks · cards: ${steps.join(" · ")}`);
    const lang = beat.lang ?? storyLanguage(here) ?? "en";
    await renderBeatScrolly({
      here,
      states,
      textPerRegister,
      evidenceLevels: beat.evidenceLevels ?? 3,
      async render({ label, direction, outDir }) {
        const { ink, muted } = deriveFurniture(direction.ground);
        const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
        const { outPath } = await renderScrolly({
          steps: prose.map((p, i) => ({ id: steps[i], prose: p })),
          reveal: {
            element: createElement(GestureXYScrolly, { data, still, notes: data.notes, yName, xName, alt, regs, ground: direction.ground, accent: direction.accent, ink, muted }),
            states,
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
