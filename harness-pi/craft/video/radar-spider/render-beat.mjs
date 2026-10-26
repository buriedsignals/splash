// The generic half of a radar VIDEO beat, taken from proof/video-radar-electricity-mix/render-directions-video.mjs with
// everything about ITS subject removed. The choreography is the worked example's and is not the model's to change: the
// title card; the two items' wholes as two bars on one scale, names before them, totals after; the other's bar
// stretching to the subject's length — each becomes its own whole, 100 % — and gaps cutting both into their spokes'
// parts; the camera pulling back as the wheel arrives, and spoke after spoke both parts swinging onto their spoke keeping
// their length, the two outlines joining tip to tip; then both outlines closing and filling, the named spoke's two shares
// ringed, the credit. The timing contract and the shots are the proof's (timing-contract.ts, states.mjs, scene.mjs); the
// layout is the proof's build.mjs. ./beat.mjs — the one file the model writes — gives the data and the WORDS.
//
// Usage:  bun <beat>/render-beat.mjs [--size landscape|square|portrait] [--look-only]
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { videoExportSize } from "#shared/chart-video/sizes.mjs";
import { applyStoryboard, assertNumbers, assertLegibleLabels, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { assertEventFramesReadable, pickDirection, plain, refusing, renderBeatVideo, storyLanguage } from "./video.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const NB = " ";
const COMPOSITION_BASE = "zone-video-radar-spider"; // Root.tsx registers `${COMPOSITION_BASE}-${size}`

/** A word function of beat.mjs, called and held to a non-empty string — a throw or a non-string names the field. */
function wordOf(name, fn, arg) {
  let out;
  try {
    out = fn(arg);
  } catch (error) {
    throw new Error(`beat.mjs: ${name}(${JSON.stringify(arg)}) threw « ${error.message} » — fix ${name} (see CONTRACT.md)`);
  }
  if (typeof out !== "string" || !out.trim()) throw new Error(`beat.mjs: ${name}(${JSON.stringify(arg)}) returned ${JSON.stringify(out)}, not a non-empty string — fix ${name} (see CONTRACT.md)`);
  return plain(out);
}

await refusing(HERE, async () => {
  const SIZE = videoExportSize();
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);

  const REQUIRED = ["eyebrow", "items", "subject", "spokes", "named", "format", "formatTotal", "title", "source", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const field of ["check", "format", "formatTotal"]) if (typeof beat[field] !== "function") throw new Error(`beat.mjs: ${field} must be a function (see CONTRACT.md)`);
  if (beat.percent !== undefined && typeof beat.percent !== "function") throw new Error("beat.mjs: percent must be a function (see CONTRACT.md)");
  if (typeof beat.eyebrow !== "string") throw new Error("beat.mjs: eyebrow must be a string (see CONTRACT.md)");
  if (!Array.isArray(beat.spokes)) throw new Error("beat.mjs: spokes must be an array of { key, label, values } (see CONTRACT.md)");
  assertNumbers(beat.spokes.flatMap((s) => [beat.items].flat().map((item, i) => [`${s.key} ${item}`, s.values?.[i]])), "spoke values");

  const { subjectOf, assertGesture } = await import("./subject.mjs");
  const subject = subjectOf({ ...beat, items: [beat.items].flat().map(plain), subject: plain(beat.subject), spokes: beat.spokes.map((s) => ({ ...s, label: plain(s.label) })) });
  // The claim first: a title the data no longer supports is the refusal to read, before any the gesture raises.
  beat.check();
  assertGesture(subject);

  const shares = subject.countries.flatMap((c) => c.shares);
  const totals = subject.countries.map((c) => c.total);
  assertLegibleLabels(shares, (v) => wordOf("format", beat.format, v));
  assertDrawsClaimColumn(subject.countries.flatMap((c) => c.twh), HERE);
  assertHeadlineNumbersDrawn([beat.title].flat()[0], [...shares, ...totals, subject.ratio], "spokes");

  // ── the words, in the shape the proof's build.mjs reads (`copyOf` there)
  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  const spaced = /^(fr)\b/i.test(lang);
  const percent = beat.percent ? (v) => wordOf("percent", beat.percent, v) : (v) => `${v}${spaced ? NB : ""}%`;
  const format = (v) => wordOf("format", beat.format, v);
  const copy = {
    eyebrow: plain(beat.eyebrow),
    title: [beat.title].flat().map(plain),
    twh: (v) => wordOf("formatTotal", beat.formatTotal, v),
    full: percent(100),
    ceiling: (v) => percent(v),
    shares: (a, b) => [format(a), `${NB}·${NB}`, format(b)],
    shortSpoke: Object.fromEntries(beat.spokes.filter((s) => s.shortLabel).map((s) => [String(s.key), plain(s.shortLabel)])),
    source: [beat.source].flat().map(plain),
  };
  if (!copy.title.length || copy.title.some((t) => !t.trim())) throw new Error("title must hold at least one non-empty form (the takeaway first)");
  if (!copy.source.length || copy.source.some((t) => !t.trim())) throw new Error("source must hold at least one non-empty form");

  const { buildDirection, loadBeat, textPerRegisterOf } = await import("./build.mjs");
  const { RadarFrame } = await import("./RadarFrame.tsx");
  const { sceneAt, spokeAngle, WINDOWS } = await import("./scene.mjs");
  const { label, chosen } = pickDirection(HERE, textPerRegisterOf(copy, subject), beat.evidenceLevels ?? 3);
  let built;
  try {
    built = buildDirection(label, chosen, loadBeat(subject, copy));
  } catch (error) {
    // The proof's layout refusals name the frame, not the beat: say what in beat.mjs moves them.
    const layout = /no wheel radius|runs into|leaves the frame|run wider|floor/.test(error.message);
    throw new Error(layout ? `${error.message} — shorten the spoke labels (or give them a shortLabel), the item names, format / formatTotal, or the source forms` : error.message);
  }
  const { props, report, direction } = built;
  console.log(`direction ${label}`);
  for (const d of direction.decisions ?? []) console.log(`  ${d.register.padEnd(8)} ${d.role.padEnd(15)} -> ${d.family}`);
  console.log(`  title form ${report.titleForm + 1} · source form ${report.sourceForm + 1} · spoke names form ${report.labelForm + 1} · wheel radius ${Math.round(report.radius)}px · bars zoom ${report.zoom}`);

  try {
    assertEventFramesReadable(RadarFrame, props, SIZE, label);
  } catch (error) {
    throw new Error(`${error.message} — shorten the words that frame draws (spoke labels, item names, title forms, source forms)`);
  }

  // What the proof's frame.test.ts held per direction, now for this data: every part keeps its length (share × px per %
  // × the camera's zoom) while it swings, and lands with its tip at the share's radius on its own spoke.
  const T = props.timing;
  const last = (event) => T[event].start + T[event].duration - 1;
  const within = (event, field, t) => {
    const [a, b] = WINDOWS[event][field];
    return Math.round(T[event].start + T[event].duration * (a + (b - a) * t));
  };
  const { wheel, countries } = props;
  const n = props.countries[0].shares.length;
  const lengthOf = (p) => Math.hypot(p.x2 - p.x1, p.y2 - p.y1);
  for (const t of [0.04, 0.3, 0.55]) {
    const s = sceneAt(props, within("subject", "fly", t));
    countries.forEach((c, i) =>
      s.countries[i].parts.forEach((p, j) => {
        if (!(Math.abs(lengthOf(p) - c.shares[j] * wheel.pxPerPct * s.z) < 1e-4)) throw new Error("a part's length changes while it swings onto its spoke (a kit bug)");
      }),
    );
  }
  const end = sceneAt(props, last("subject"));
  countries.forEach((c, i) =>
    end.countries[i].parts.forEach((p, j) => {
      const theta = spokeAngle(j, n);
      const along = (x, y) => (x - wheel.x) * Math.cos(theta) + (y - wheel.y) * Math.sin(theta);
      if (!(Math.abs(along(p.x2, p.y2) - c.shares[j] * wheel.pxPerPct) < 1e-4)) throw new Error("a part does not land at its share's radius (a kit bug)");
    }),
  );

  // The proof's --look list: the last frame of every event, frame 0, and the middle of each gesture.
  const mid = (event, [a, b]) => Math.round(T[event].start + (T[event].duration * (a + b)) / 2);
  const lookFrames = [
    { name: "first", frame: 0 },
    { name: "end-establish", frame: last("establish") },
    { name: "end-reference", frame: last("reference") },
    { name: "reveal-cut", frame: mid("reveal", WINDOWS.reveal.cut) },
    { name: "end-reveal", frame: last("reveal") },
    { name: "subject-carry", frame: mid("subject", WINDOWS.subject.fly) },
    { name: "end-subject", frame: last("subject") },
    { name: "conclusion-close", frame: mid("conclusion", WINDOWS.conclusion.close) },
    { name: "end-conclusion", frame: last("conclusion") },
    { name: "final", frame: T.total - 1 },
  ];
  const { wantedOf } = await import((await import("#shared/design-base/skill-script.mjs")).skillScriptFrom(HERE, "chart-video", "scripts", "video-faces.mjs"));
  await renderBeatVideo({
    Frame: RadarFrame,
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
