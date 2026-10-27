// The generic half of every Part-to-whole GESTURE video (treemap, marimekko-mosaic-plot, pie-and-donut). Guard order:
// importBeat → applyStoryboard → REQUIRED → the marks → check() and the shared guards → the gesture core with this
// family's hooks (validatePart, format "video": exactly three gestures, the conclusion shows the whole) → the video
// scheduler and the layout (./gesture-part-video-build.mjs) → the type floor at every event's end and every climbing
// figure measured → the look stills, then the mp4. A gesture refusal prints REFUSED with the beat.mjs field and a
// value that works; with SPLASH_GESTURE_REPAIR=1 the refusal's fix is applied instead and the list staged again, at
// most 12 times. Nothing here refuses the data's SHAPE. Node-side.
//
// Usage (through the kit's render-beat.mjs):  bun <beat>/render-beat.mjs [--size landscape|square|portrait] [--look-only]
import { videoExportSize } from "#shared/chart-video/sizes.mjs";
import { applyFix, GestureRefusal } from "./gesture-core.mjs";
import { validatePart } from "./gesture-family-part.mjs";
import { readClaim, readPartBeat } from "./gesture-part-run-static.mjs";
import { partSceneAt } from "./gesture-part-video.mjs";
import { applyStoryboard, assertHeadlineNumbersDrawn, importBeat } from "./guards.mjs";
import { assertEventFramesReadable, pickDirection, plain, refusing, renderBeatVideo } from "./video.mjs";

const hintOf = (fix) => {
  const value = fix && ("set" in fix ? fix.set.value : "add" in fix ? fix.add.gesture : undefined);
  return "remove" in (fix ?? {}) ? " (drop that gesture)" : value !== undefined ? ` — a value that works: ${JSON.stringify(value)}` : "";
};

export async function runPartVideo({ here, variant, composition, timing, Frame }) {
  const REPAIR = process.env.SPLASH_GESTURE_REPAIR === "1";
  await refusing(here, async () => {
    const SIZE = videoExportSize();
    const beat = await importBeat(here);
    applyStoryboard(beat, here);
    const { marks, title, headlineValues } = readPartBeat(beat, here, variant);
    const format = (v) => plain(beat.format(v));
    const copy = {
      eyebrow: plain(beat.eyebrow),
      title: plain(title[0]),
      source: [beat.source].flat().map(plain),
      unit: plain(beat.unit),
      restLabel: plain(beat.restLabel),
      format,
    };
    if (!copy.title.trim()) throw new Error("title must be the journalist's takeaway, copied as written");
    const claim = readClaim(here, title[0], beat.unit);
    const { buildPartVideo, textPerRegisterOf } = await import("./gesture-part-video-build.mjs");
    const { label, chosen } = pickDirection(here, textPerRegisterOf(copy, marks, beat.gestures), beat.evidenceLevels ?? 2);
    let list = beat.gestures;
    let built;
    let valid;
    for (let step = 0; ; step++) {
      try {
        ({ valid } = validatePart({ variant, gestures: list, marks, claim, format: "video" }));
        built = buildPartVideo({ id: label, chosen, variant, marks, gestures: valid, copy, size: SIZE });
        break;
      } catch (error) {
        if (!(error instanceof GestureRefusal)) throw error;
        if (!REPAIR || step >= 12) throw new Error(`${error.message}${hintOf(error.fix)}`);
        console.log(`REPAIRED gestures: ${error.field} → ${JSON.stringify(error.fix)}`);
        list = applyFix(list, error.fix);
      }
    }
    assertHeadlineNumbersDrawn(title[0], [...headlineValues, marks.length, ...valid.map((g) => g.marks.length)], "parts");
    const { props, report, direction } = built;
    props.timing = timing;
    console.log(`direction ${label}`);
    for (const d of direction.decisions ?? []) console.log(`  ${d.register.padEnd(8)} ${d.role.padEnd(15)} -> ${d.family}`);
    console.log(`  ${report.drawn} of ${report.of} parts drawn (${report.rest} folded) · ${report.captions} caption(s) · title on ${report.titleLines} line(s)`);
    console.log(`  gestures: ${props.plan.map((p) => `${p.event} ${p.do}${p.marks.length ? ` ${p.marks.length > 3 ? `${p.marks.length} parts` : p.marks.join(", ")}` : ""}`).join(" · ")}`);
    try {
      assertEventFramesReadable(Frame, props, SIZE, label);
    } catch (error) {
      throw new Error(`${error.message} — shorten the words that frame draws (notes, the title, source forms)`);
    }
    // Every figure a count or bracket climbs through was measured in Bun.
    for (let frame = 0; frame < timing.total; frame += 1)
      for (const c of partSceneAt(props, frame).captions)
        if (c.figure && !(c.figure in props.countWidths)) throw new Error(`a figure shows ${JSON.stringify(c.figure)} at frame ${frame}, a text the build did not measure (a kit bug, not a beat.mjs one)`);

    const T = timing;
    const end = (e) => T[e].start + T[e].duration - 1;
    const mid = (e) => Math.round(T[e].start + T[e].duration * 0.5);
    const lookFrames = [
      { name: "end-establish", frame: end("establish") },
      { name: "end-reference", frame: end("reference") },
      { name: `reveal-${props.plan[0].do}`, frame: mid("reveal") },
      { name: "end-subject", frame: end("subject") },
      { name: "end-conclusion", frame: end("conclusion") },
      { name: "final", frame: T.total - 1 },
    ];
    const { skillScriptFrom } = await import("#shared/design-base/skill-script.mjs");
    const { wantedOf } = await import(skillScriptFrom(here, "chart-video", "scripts", "video-faces.mjs"));
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
