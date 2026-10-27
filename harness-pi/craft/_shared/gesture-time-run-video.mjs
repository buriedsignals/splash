// The VIDEO runner of every Time-series GESTURE beat (line, area-and-stacked-area, streamgraph, bump-ranking-over-time).
// Guard order: applyStoryboard → REQUIRED → the readings → check() and the shared guards (./gesture-time-run.mjs
// loadTimeBeat) → the gesture core (validateTime, format "video", claim read from STORYBOARD.md) → the video scheduler
// and the layout (./gesture-time-video-build.mjs) → the type floor at every event's end → the look stills, then the
// mp4. A gesture refusal prints REFUSED with the beat.mjs field and a value that works; with SPLASH_GESTURE_REPAIR=1 the
// refusal's fix is applied instead and the list staged again, at most 12 times. Node only.
//
// Usage (from a kit's render-beat.mjs):  bun <beat>/render-beat.mjs [--size landscape|square|portrait] [--look-only]
import { videoExportSize } from "#shared/chart-video/sizes.mjs";
import { validateTime } from "./gesture-family-time.mjs";
import { loadTimeBeat, staged } from "./gesture-time-run.mjs";
import { assertEventFramesReadable, pickDirection, plain, refusing, renderBeatVideo } from "./video.mjs";

export async function runTimeVideo(here, variant) {
  await refusing(here, async () => {
    const SIZE = videoExportSize();
    const { beat, model, claim, format, titleForms, fallbackSubject } = await loadTimeBeat(here, variant, { format: "video" });
    for (const field of ["eyebrow", "unit"]) if (typeof beat[field] !== "string") throw new Error(`beat.mjs: ${field} must be a string (see CONTRACT.md)`);
    const copy = {
      eyebrow: plain(beat.eyebrow),
      title: plain(titleForms[0]),
      source: [beat.source].flat().map(plain),
      unit: plain(beat.unit).trim(),
      format: (v) => plain(format(v)),
      gapLabel: beat.gapLabel,
    };
    if (!copy.title.trim()) throw new Error("title must be the journalist's takeaway, copied as written");
    if (!copy.source.length || copy.source.some((t) => !t.trim())) throw new Error("source must hold at least one non-empty form");

    const { GESTURE_VIDEO_TIMING } = await import(`${here}/timing-contract.ts`);
    const { buildTimeVideo, textPerRegisterOf } = await import("./gesture-time-video-build.mjs");
    const { label, chosen } = pickDirection(here, textPerRegisterOf(copy, model, beat.gestures.filter((g) => g && typeof g === "object")), beat.evidenceLevels ?? 3);
    const built = staged((list) => {
      const valid = validateTime({ gestures: list, model, format: "video", claim, fallbackSubject });
      return buildTimeVideo({ id: label, chosen, model, valid: valid.gestures, subject: valid.subject, copy, size: SIZE, timing: GESTURE_VIDEO_TIMING, gestures: list });
    }, beat.gestures);
    const { props, report, direction } = built;
    console.log(`direction ${label}`);
    console.log(`  ${report.series} series · ${report.readings} readings · title on ${report.titleLines} line(s) · ${report.captions} caption line(s)`);
    console.log(`  gestures: ${props.plan.map((p) => `${p.event} ${p.do}`).join(" · ")}`);

    const { GestureTimeFrame } = await import("./GestureTimeFrame.tsx");
    try {
      assertEventFramesReadable(GestureTimeFrame, props, SIZE, label);
    } catch (error) {
      throw new Error(`${error.message} — shorten the words that frame draws (notes, the title, source forms)`);
    }

    const T = props.timing;
    const end = (e) => T[e].start + T[e].duration - 1;
    const mid = (e) => Math.round(T[e].start + T[e].duration * 0.5);
    const lookFrames = [
      { name: "end-establish", frame: end("establish") },
      { name: "end-reference", frame: end("reference") },
      { name: `reveal-${props.plan[0].do}`, frame: mid("reveal") },
      { name: "end-reveal", frame: end("reveal") },
      { name: `subject-${props.plan[1].do}`, frame: mid("subject") },
      { name: "end-subject", frame: end("subject") },
      { name: `conclusion-${props.plan[2].do}`, frame: mid("conclusion") },
      { name: "final", frame: T.total - 1 },
    ];
    const { skillScriptFrom } = await import("#shared/design-base/skill-script.mjs");
    const { wantedOf } = await import(skillScriptFrom(here, "chart-video", "scripts", "video-faces.mjs"));
    await renderBeatVideo({
      Frame: GestureTimeFrame,
      here,
      label: SIZE === "landscape" ? label : `${label}-${SIZE}`,
      composition: `zone-video-${variant}-gestures-${SIZE}`,
      size: SIZE,
      props,
      wanted: wantedOf(props.registers),
      lookFrames,
      lookOnly: process.argv.includes("--look-only"),
    });
    void direction;
  });
}
