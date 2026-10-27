// The video render every AREA-map gesture kit shares: read and guard the beat (gesture-geo-area-run.mjs), validate the
// gestures (family geo, format video: exactly three, the third showing the whole map), schedule the six events
// (gesture-geo-area-video.mjs), lay the map out at the video's own size, MEASURE every word the frames draw (title
// card, credit, codes, named values, notes) in Bun, render the look stills and the mp4 through the kit's Remotion
// entry (Root.tsx / index.ts beside it), and print the still to look at. No live tiles: the map is the frozen shapes
// or the designed grid, so a render spends no MapTiler tile and needs no key.
import { adjustToContrast, contrast, mix, NON_TEXT_CONTRAST_MIN, TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { videoExportSize, frameInsetFor, sizeFor } from "#shared/chart-video/sizes.mjs";
import { EYEBROW_TO_DISPLAY, registerOf } from "#shared/design-base/register.mjs";
import { resolveDirectionFamilies } from "#shared/design-base/resolve-families.mjs";
import { skillScriptFrom } from "#shared/design-base/skill-script.mjs";
import { stageGeo } from "./gesture-geo-area-static.mjs";
import { scheduleGeoVideo } from "./gesture-geo-area-video.mjs";
import { layoutCells, seatsBox } from "./gesture-geo-area-shapes.mjs";
import { assertZoomFactors, readGeoBeat, readShapes, REPAIR } from "./gesture-geo-area-run.mjs";
import { classIndex } from "./gesture-family-geo.mjs";
import { assertEventFramesReadable, pickDirection, plain, refusing, renderBeatVideo } from "./video.mjs";

const REGISTER_NAMES = ["display", "eyebrow", "body", "annot", "value", "axis"];
const EVENTS = ["establish", "reference", "reveal", "subject", "conclusion", "hold"];

export async function renderGeoAreaVideo(here, variant, { composition, timing }) {
  await refusing(here, async () => {
    const SIZE = videoExportSize();
    const chartVideo = (...parts) => skillScriptFrom(here, "chart-video", "scripts", ...parts);
    const { applyCase } = await import(chartVideo("registers.mjs"));
    const { BAND_PROBE, bandOf, CREDIT_ONE_LINE, CREDIT_MAX_LINES, haloOf, sourceCreditFor, titleCardFor, verticalInsetFor, widthOf, wrap } = await import(chartVideo("shots.mjs"));
    const { videoRegistersOf } = await import(chartVideo("video-registers.mjs"));
    const { assertEventStates } = await import(chartVideo("choreography.mjs"));
    const { wantedOf } = await import(chartVideo("video-faces.mjs"));

    const { beat, rows, points, geo, claim, titles } = await readGeoBeat(here, variant);
    const format = (v) => plain(beat.format(v));
    const title = plain(titles[0]);
    const eyebrow = plain(beat.eyebrow);
    const source = [beat.source].flat().map(plain);
    const notesText = beat.gestures.map((g) => (g && g.note ? plain(g.note) : "")).join(" ");
    const textPerRegister = {
      display: title,
      eyebrow,
      body: source.join(" "),
      annot: `${notesText} ${rows.map((r) => r.name).join(" ")}`,
      value: geo.marks.map((m) => format(m.value)).join(" "),
      axis: `${rows.map((r) => r.key).join(" ")} ${source.join(" ")} ${plain(beat.unit)}`,
    };
    const { label, chosen } = pickDirection(here, textPerRegister, beat.evidenceLevels ?? geo.breaks.length + 1);
    const direction = resolveDirectionFamilies(chosen, textPerRegister);
    const resolved = Object.fromEntries(REGISTER_NAMES.map((name) => [name, registerOf(direction, name)]));
    const registers = videoRegistersOf(resolved, SIZE);
    const k = registers.axis.fontSize / resolved.axis.fontSize;
    const stage = sizeFor(SIZE);
    const inset = frameInsetFor(SIZE);
    const vInset = verticalInsetFor(SIZE);
    const { axis, annot, value } = registers;
    const band = (r) => bandOf(BAND_PROBE, r);
    const measured = (text, r) => {
      const t = applyCase(text, r.transform);
      return { text: t, width: widthOf(t, r) };
    };

    // ── words: title card, credit, the unit line, each gesture's note (wrapped to the content width)
    const titleCard = titleCardFor({ registers, eyebrow, title: [title], size: SIZE, eyebrowToDisplay: EYEBROW_TO_DISPLAY });
    let creditBlock;
    try {
      creditBlock = sourceCreditFor({ registers, forms: source, size: SIZE, k, ...CREDIT_ONE_LINE });
    } catch {
      creditBlock = sourceCreditFor({ registers, forms: source, size: SIZE, k, measure: 1, maxLines: CREDIT_MAX_LINES });
    }
    const { register: sourceRegister, ...credit } = creditBlock;
    const creditAt = { x: inset, y: stage.height - vInset - credit.height };
    const content = { left: inset, width: stage.width - 2 * inset };
    const unitLine = { ...measured(plain(beat.unit), axis), x: inset, y: vInset + band(axis).ascent };
    const noteTop = unitLine.y + band(axis).descent + annot.lead;

    // ── stage the gestures, then lay the map out under the notes and over the credit
    let layout;
    let notes;
    const built = stageGeo({
      gestures: beat.gestures,
      geo,
      format: "video",
      claim,
      repair: REPAIR(),
      stage: (valid) => {
        notes = valid.map((g) => (g.note ? wrap(applyCase(plain(g.note), annot.transform), annot, content.width * 0.6).map((l) => ({ text: l.text ?? l, width: widthOf(l.text ?? l, annot) })) : []));
        const noteLines = Math.max(1, ...notes.map((n) => n.length));
        const mapTop = noteTop + noteLines * annot.lead;
        const box = { x: inset, y: mapTop, width: content.width, height: creditAt.y - mapTop - axis.lead };
        layout = layoutCells(variant, { rows, shapes: readShapes(here), grid: beat.grid, points, box });
        const W = stage.width;
        assertZoomFactors(valid, (g) => {
          const b = seatsBox(layout.cells, g.marks.map(geo.resolve), Math.max(box.width, box.height) * 0.08);
          return b ? 1 / Math.max(b.width / box.width, b.height / box.height, 0.12) : 1;
        });
        return { valid, ...scheduleGeoVideo({ valid, geo }), box, W };
      },
    });
    for (const r of built.repairs) console.log(`REPAIRED gestures: ${r}`);
    const { valid, events, box } = built.staged;

    // The camera of a state, as a view box over the map's box; the frame scales the map into the box.
    const viewOf = (s) => {
      if (s.camera !== "closeUp" || !s.focus?.length) return { vx: box.x, vy: box.y, vw: box.width, vh: box.height };
      const b = seatsBox(layout.cells, s.focus, Math.max(box.width, box.height) * 0.08);
      const kk = Math.max(b.width / box.width, b.height / box.height, 0.12);
      return { vx: b.x + b.width / 2 - (box.width * kk) / 2, vy: b.y + b.height / 2 - (box.height * kk) / 2, vw: box.width * kk, vh: box.height * kk };
    };
    const states = events.map((e) => ({ ...e.flat, ...viewOf(e.state) }));
    assertEventStates(states, EVENTS);
    // Words exist only at a measured camera: in an event whose camera travels, names land at its end.
    const windows = Object.fromEntries(EVENTS.map((e, i) => [e, i > 0 && states[i].vw !== states[i - 1].vw ? Object.fromEntries(Object.keys(states[i]).filter((f) => f.startsWith("n:")).map((f) => [f, [0.85, 1]])) : {}]));

    // ── colours, from the ground, one accent
    const { ink, muted, grid } = deriveFurniture(direction.ground);
    const classCount = geo.breaks.length + 1;
    const lowest = (() => {
      const c = mix(direction.accent, direction.ground, 0.88);
      return contrast(c, direction.ground) >= NON_TEXT_CONTRAST_MIN ? c : adjustToContrast(c, direction.ground, NON_TEXT_CONTRAST_MIN);
    })();
    const high = mix(direction.accent, ink, 0.3);
    const classFill = Array.from({ length: classCount }, (_, i) => mix(lowest, high, classCount > 1 ? i / (classCount - 1) : 0.5));
    const labelInk = adjustToContrast(ink, direction.ground, TEXT_CONTRAST_MIN) ?? ink;
    const legibleOn = (fill) => (contrast(labelInk, fill) >= contrast(direction.ground, fill) ? labelInk : direction.ground);
    const colours = {
      ground: direction.ground,
      grid,
      land: mix(direction.ground, ink, 0.07),
      missing: mix(direction.ground, ink, 0.16),
      classFill,
      backFill: classFill.map((c) => mix(c, direction.ground, 0.72)),
      accent: adjustToContrast(direction.accent, direction.ground, TEXT_CONTRAST_MIN) ?? direction.accent,
      ink: labelInk,
      dot: mix(muted, direction.ground, 0.15),
      text: {
        eyebrow: adjustToContrast(registers.eyebrow.fill ?? direction.accent, direction.ground, TEXT_CONTRAST_MIN),
        title: adjustToContrast(registers.display.fill ?? ink, direction.ground, TEXT_CONTRAST_MIN),
        axis: adjustToContrast(muted, direction.ground, TEXT_CONTRAST_MIN),
        note: labelInk,
      },
    };
    const grids = variant !== "choropleth" && variant !== "dot-density";
    const cells = layout.cells.map((c) => {
      const i = c.value === null ? null : classIndex(c.value, geo.breaks);
      const named = c.value === null ? null : measured(grids ? format(c.value) : `${c.name} ${format(c.value)}`, annot);
      const code = grids ? measured(c.key, axis) : null;
      return { key: c.key, d: c.d, seat: c.seat, size: c.size, klass: i, codeInk: i === null ? labelInk : legibleOn(classFill[i]), backInk: i === null ? labelInk : legibleOn(mix(classFill[i], direction.ground, 0.72)), code, named };
    });

    const props = {
      variant,
      frame: { width: stage.width, height: stage.height },
      registers: { display: titleCard.register, eyebrow: registers.eyebrow, value, axis, annot, source: sourceRegister },
      titleCard,
      credit: { ...credit, at: creditAt },
      colours,
      unitLine,
      noteTop,
      notes,
      box,
      cells,
      land: layout.land.map((l) => l.d),
      dots: layout.dots.map((d) => ({ x: Math.round(d.x * 10) / 10, y: Math.round(d.y * 10) / 10, key: d.key })),
      grids,
      states,
      windows,
      linear: ["classes", "vx", "vy", "vw", "vh"],
      strokes: { rule: (direction.stroke?.rule ?? 1) * k * 1.4 },
      halo: haloOf(annot, k),
      timing,
    };
    console.log(`direction ${label} · ${geo.marks.length} places · gestures: ${valid.map((g, i) => `${EVENTS[i + 2]} ${g.do}`).join(" · ")}`);
    const { GestureGeoAreaFrame } = await import("./GestureGeoAreaFrame.tsx");
    assertEventFramesReadable(GestureGeoAreaFrame, props, SIZE, label);
    const T = timing;
    const mid = (e) => Math.round(T[e].start + T[e].duration * 0.5);
    const end = (e) => T[e].start + T[e].duration - 1;
    const lookFrames = [
      { name: "end-reference", frame: end("reference") },
      { name: `subject-${valid[1].do}`, frame: mid("subject") },
      { name: "end-subject", frame: end("subject") },
      { name: "final", frame: T.total - 1 },
    ];
    await renderBeatVideo({
      Frame: GestureGeoAreaFrame,
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
