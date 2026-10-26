// The generic half of a pie-and-donut VIDEO beat, taken from proof/video-donut-world-co2-share/render-directions-video.mjs
// with everything about ITS subject removed. The choreography is the worked example's and is not the model's to change:
// the title card; the whole at the first state as one ring whose circumference is its total, the rings' arcs traced end
// to end from twelve o'clock, two of them named beside their arcs, the total in the hole; a copy of the ring growing out
// of it to the second state's total, every arc's length its value on one scale; then the whole splitting into one ring
// per member, each pair of arcs keeping its angle in flight — one turn is the whole on every ring — the second-state
// share in each hole, the name and both values under each ring; the subject's number ringed, the credit. The timing
// contract and the shots are the proof's (timing-contract.ts, states.mjs, scene.mjs); the layout is the proof's
// build.mjs. ./beat.mjs — the one file the model writes — gives the data and the WORDS.
//
// Usage:  bun <beat>/render-beat.mjs [--size landscape|square|portrait] [--look-only]
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { videoExportSize } from "#shared/chart-video/sizes.mjs";
import { applyStoryboard, assertNumbers, assertLegibleLabels, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { assertEventFramesReadable, pickDirection, plain, refusing, renderBeatVideo } from "./video.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const COMPOSITION_BASE = "zone-video-pie-and-donut"; // Root.tsx registers `${COMPOSITION_BASE}-${size}`
const TURN = 2 * Math.PI;

/** A word function of beat.mjs, called and held to a non-empty string — a throw or a non-string names the field. */
function wordOf(name, fn, ...args) {
  let out;
  try {
    out = fn(...args);
  } catch (error) {
    throw new Error(`beat.mjs: ${name}(${args.map((a) => JSON.stringify(a)).join(", ")}) threw « ${error.message} » — fix ${name} (see CONTRACT.md)`);
  }
  if (typeof out !== "string" || !out.trim()) throw new Error(`beat.mjs: ${name}(${args.map((a) => JSON.stringify(a)).join(", ")}) returned ${JSON.stringify(out)}, not a non-empty string — fix ${name} (see CONTRACT.md)`);
  return plain(out);
}

await refusing(HERE, async () => {
  const SIZE = videoExportSize();
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);

  const REQUIRED = ["eyebrow", "rings", "wholeBefore", "wholeAfter", "subject", "named", "from", "to", "formatShare", "formatAbsolute", "title", "source", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const field of ["check", "formatShare", "formatAbsolute"]) if (typeof beat[field] !== "function") throw new Error(`beat.mjs: ${field} must be a function (see CONTRACT.md)`);
  if (beat.fewerNote !== undefined && typeof beat.fewerNote !== "function") throw new Error("beat.mjs: fewerNote must be a function of the number of rings drawn (see CONTRACT.md)");
  if (typeof beat.eyebrow !== "string") throw new Error("beat.mjs: eyebrow must be a string (see CONTRACT.md)");
  if (!Array.isArray(beat.rings)) throw new Error("beat.mjs: rings must be an array of { key, name, before, after } (see CONTRACT.md)");
  if (String(beat.from) === String(beat.to)) throw new Error(`from and to are both ${beat.from}: the two states must differ`);
  assertNumbers([...beat.rings.flatMap((r) => [[`${r.key} before`, r.before], [`${r.key} after`, r.after]]), ["wholeBefore", beat.wholeBefore], ["wholeAfter", beat.wholeAfter]], "rings");

  const { subjectOf, assertGesture } = await import("./subject.mjs");
  const subject = subjectOf({ ...beat, rings: beat.rings.map((r) => ({ ...r, name: plain(r.name) })) });
  const rings = subject.countries.map((c) => ({ code: c.code, name: c.name, shareBefore: c.share0, shareAfter: c.share1, gtBefore: c.gt0, gtAfter: c.gt1 }));
  // The claim first: a title the data no longer supports is the refusal to read, before any the gesture raises.
  beat.check({ rings, wholeGrowth: subject.growth });
  assertGesture(subject);

  const shares = subject.countries.flatMap((c) => [c.share0, c.share1]);
  const absolutes = subject.countries.flatMap((c) => [c.gt0, c.gt1]);
  assertLegibleLabels(shares, (v) => wordOf("formatShare", beat.formatShare, v));
  assertDrawsClaimColumn(absolutes, HERE);
  assertHeadlineNumbersDrawn([beat.title].flat()[0], [...shares, ...absolutes, subject.world0, subject.world1, subject.growth], "rings");

  // ── the words, in the shape the proof's build.mjs reads (`copyOf` there)
  const share = (v) => wordOf("formatShare", beat.formatShare, v);
  const abs = (v) => wordOf("formatAbsolute", beat.formatAbsolute, v);
  const filed = [beat.source].flat().map(plain);
  const copy = {
    eyebrow: plain(beat.eyebrow),
    title: [beat.title].flat().map(plain),
    share,
    label: (name, v) => `${name} ${share(v)}`,
    world: (state, v) => `${state} · ${abs(v)}`,
    tonnes: [(state, v) => `${state} · ${abs(v)}`, (_, v) => abs(v)],
    // When the frame draws fewer rings than the beat gave, every credit form leads with the sentence that says so.
    source: (drawn, total) => {
      if (drawn >= total || !beat.fewerNote) return filed;
      const said = wordOf("fewerNote", beat.fewerNote, drawn);
      return filed.map((f) => `${said} · ${f}`);
    },
  };
  if (!copy.title.length || copy.title.some((t) => !t.trim())) throw new Error("title must hold at least one non-empty form (the takeaway first)");
  if (!filed.length || filed.some((t) => !t.trim())) throw new Error("source must hold at least one non-empty form");

  const { buildDirection, loadBeat, textPerRegisterOf } = await import("./build.mjs");
  const { DonutFrame } = await import("./DonutFrame.tsx");
  const { sceneAt, WINDOWS } = await import("./scene.mjs");
  const { label, chosen } = pickDirection(HERE, textPerRegisterOf(copy, subject), beat.evidenceLevels ?? 4);
  let built;
  try {
    built = buildDirection(label, chosen, loadBeat(subject, copy));
  } catch (error) {
    // The proof's layout refusals name the frame, not the beat: say what in beat.mjs moves them.
    const layout = /find no arrangement|no world radius|runs wider|cannot hold|under three|finds no seat|floor/.test(error.message);
    throw new Error(layout ? `${error.message} — shorten the names in rings, formatShare / formatAbsolute or the source forms, or draw fewer rings (a share too small to see makes an arc under three pixels)` : error.message);
  }
  const { props, report, direction } = built;
  console.log(`direction ${label}`);
  for (const d of direction.decisions ?? []) console.log(`  ${d.register.padEnd(8)} ${d.role.padEnd(15)} -> ${d.family}`);
  console.log(`  title form ${report.titleForm + 1} · source form ${report.sourceForm + 1} · ${report.rings} of ${report.ofRings} rings · world radius ${report.r1}px · ring ${report.edge}px · past ${report.past} · values form ${report.tonnesForm}`);
  if (report.rings < report.ofRings && !beat.fewerNote)
    throw new Error(`this frame holds only ${report.rings} of the ${report.ofRings} rings: add fewerNote(n), the sentence the credit leads with to say only the first n are drawn`);

  try {
    assertEventFramesReadable(DonutFrame, props, SIZE, label);
  } catch (error) {
    throw new Error(`${error.message} — shorten the words that frame draws (names, values, title forms, source forms)`);
  }

  // What the proof's frame.test.ts held per direction, now for this data: while the ring grows every arc's length is its
  // value on one scale, and after the split every arc keeps its angle and lands on its seat.
  const T = props.timing;
  const last = (event) => T[event].start + T[event].duration - 1;
  const within = (event, [a, b], t) => Math.round(T[event].start + T[event].duration * (a + (b - a) * t));
  const { world, small, countries } = props;
  for (const t of [0.3, 0.6]) {
    const s = sceneAt(props, within("reveal", WINDOWS.reveal.grow, t));
    const u = (s.worldR - world.r0) / (world.r1 - world.r0);
    countries.forEach((c, i) => {
      const a = s.arcs[i].after;
      if (!(Math.abs(a.sweep * a.r - world.pxPerGt * (c.gt0 + (c.gt1 - c.gt0) * u)) < 1e-4)) throw new Error("an arc's length is not its value while the ring grows (a kit bug)");
    });
  }
  const landed = sceneAt(props, last("subject"));
  countries.forEach((c, i) => {
    const { before, after } = landed.arcs[i];
    const ok = before.x === c.seat.x && before.y === c.seat.y && after.x === c.seat.x && Math.abs(after.sweep - (c.share1 / 100) * TURN) < 1e-9 && Math.abs(before.sweep - (c.share0 / 100) * TURN) < 1e-9;
    if (!ok) throw new Error(`${c.code}'s ring does not land on its seat at its shares (a kit bug)`);
  });

  // The proof's --look list: the last frame of every event, frame 0, and the middle of each gesture.
  const mid = (event, [a, b]) => Math.round(T[event].start + (T[event].duration * (a + b)) / 2);
  const lookFrames = [
    { name: "first", frame: 0 },
    { name: "end-establish", frame: last("establish") },
    { name: "reference-trace", frame: mid("reference", WINDOWS.reference.world) },
    { name: "end-reference", frame: last("reference") },
    { name: "reveal-grow", frame: mid("reveal", WINDOWS.reveal.grow) },
    { name: "end-reveal", frame: last("reveal") },
    { name: "subject-split", frame: mid("subject", WINDOWS.subject.split) },
    { name: "end-subject", frame: last("subject") },
    { name: "end-conclusion", frame: last("conclusion") },
    { name: "final", frame: T.total - 1 },
  ];
  const { wantedOf } = await import((await import("#shared/design-base/skill-script.mjs")).skillScriptFrom(HERE, "chart-video", "scripts", "video-faces.mjs"));
  await renderBeatVideo({
    Frame: DonutFrame,
    here: HERE,
    label: SIZE === "landscape" ? label : `${label}-${SIZE}`,
    composition: `${COMPOSITION_BASE}-${SIZE}`,
    size: SIZE,
    props,
    wanted: wantedOf(props.registers),
    lookFrames,
    lookOnly: process.argv.includes("--look-only"),
  });
});
