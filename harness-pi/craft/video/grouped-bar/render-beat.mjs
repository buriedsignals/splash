// The generic half of a grouped-bar VIDEO beat, taken from proof/video-grouped-bar-wind-vs-solar/render-directions-video.mjs
// with everything about ITS subject removed. The choreography is the worked example's and is not the model's to change:
// each group's whole rises as one column, part on part, to 100 %, the two series on top; every other part fades; the
// column parts into the two series side by side, which slide down to the baseline keeping their heights; the scale closes
// onto them and their shares land; group after group the first series' level is carried across over the second, the lead
// counted; every group but the one exception steps back; then the whole chart, the exception ringed, the credit on one
// line. The timing contract and the shots are the proof's (timing-contract.ts, states.mjs, scene.mjs); the layout is the
// proof's build.mjs. ./beat.mjs — the one file the model writes — gives the data and the WORDS.
//
// Usage:  bun <beat>/render-beat.mjs [--size landscape|square|portrait] [--look-only]
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { videoExportSize } from "#shared/chart-video/sizes.mjs";
import { EVENT_ORDER, endOf } from "#shared/chart-video/timing.ts";
import { skillScriptFrom } from "#shared/design-base/skill-script.mjs";
import { applyStoryboard, assertNumbers, assertLegibleLabels, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { assertEventFramesReadable, numberFormat, pickDirection, plain, refusing, renderBeatVideo, storyLanguage } from "./video.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const COMPOSITION_BASE = "zone-video-grouped-bar"; // Root.tsx registers `${COMPOSITION_BASE}-${size}`

/** A word function of beat.mjs, called the way the frame calls it: a throw or a non-string names the field. */
const wordOf = (field, fn) => (...args) => {
  let out;
  try {
    out = fn(...args);
  } catch (error) {
    throw new Error(`beat.mjs: ${field}(${args.map((a) => JSON.stringify(a)).join(", ")}) threw: ${error.message}`);
  }
  if (typeof out !== "string" || !out.trim()) throw new Error(`beat.mjs: ${field}(${args.map((a) => JSON.stringify(a)).join(", ")}) must return a non-empty string, got ${JSON.stringify(out)}`);
  return plain(out);
};

await refusing(HERE, async () => {
  const SIZE = videoExportSize();
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);

  const REQUIRED = ["eyebrow", "groups", "firstName", "secondName", "subject", "unit", "count", "title", "source", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["count", "check"]) if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  for (const field of ["eyebrow", "firstName", "secondName", "subject", "unit"])
    if (typeof beat[field] !== "string" || !beat[field].trim()) throw new Error(`beat.mjs: ${field} must be a non-empty string (see CONTRACT.md)`);
  if (!Array.isArray(beat.groups)) throw new Error("beat.mjs: groups must be an array of { name, first, second }");
  assertNumbers(beat.groups.flatMap((g) => [[`${g.name}.first`, g.first], [`${g.name}.second`, g.second]]));
  const names = beat.groups.map((g) => String(g.name));
  if (new Set(names).size !== names.length) throw new Error("groups holds the same name twice: give each group ONE pair of shares (filter data.json to one year)");
  // The claim first: a title the data no longer supports is the refusal to read, before any the gesture raises.
  beat.check();
  const { subjectOf } = await import("./subject.mjs");
  const subject = subjectOf({ ...beat, groups: beat.groups.map((g) => ({ ...g, name: plain(g.name) })), subject: plain(beat.subject) });

  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  if (!(beat.decimals === undefined || beat.decimals === 0 || beat.decimals === 1)) throw new Error(`decimals is ${JSON.stringify(beat.decimals)}: a share is printed with 0 or 1 decimal`);
  const format = numberFormat({ lang, max: 100, decimals: beat.decimals ?? 1, decimal: beat.decimal });
  const { shareText } = await import("./scene.mjs");
  const values = subject.groups.flatMap((g) => [g.wind, g.solar]);
  assertLegibleLabels(values, (v) => shareText(v, format));
  assertDrawsClaimColumn(values, HERE);
  // The title may state a share, the lead or the number of groups — all drawn (the shares, the count).
  assertHeadlineNumbersDrawn([beat.title].flat()[0], [...values, subject.lead, subject.groups.length], "bars");

  // ── the words, in the shape the proof's build.mjs reads (`copyOf` there)
  const count = wordOf("count", beat.count);
  const copy = {
    eyebrow: plain(beat.eyebrow),
    title: [beat.title].flat().map(plain),
    series: [plain(beat.firstName), plain(beat.secondName)],
    lead: (k) => count(k, subject.groups.length),
    /** The shares print bare over their bars; the unit is said once, after the two series' names. */
    share: (text) => text,
    unit: plain(beat.unit),
    source: [beat.source].flat().map(plain),
    format,
  };
  if (!copy.title.length || copy.title.some((t) => !t.trim())) throw new Error("title must hold at least one non-empty form (the takeaway first)");
  if (!copy.source.length || copy.source.some((t) => !t.trim())) throw new Error("source must hold at least one non-empty form");

  const { buildDirection, loadBeat, textPerRegisterOf } = await import("./build.mjs");
  const { GroupedBarFrame } = await import("./GroupedBarFrame.tsx");
  const { label, chosen } = pickDirection(HERE, textPerRegisterOf(copy, subject), beat.evidenceLevels ?? 2);
  let built;
  try {
    built = buildDirection(label, chosen, loadBeat(subject, copy));
  } catch (error) {
    const layout = /no arrangement|wider than their bars|collide|the lead count wants/.test(error.message);
    throw new Error(layout ? `${error.message} — shorten the group names, count()'s words or the unit, add a shorter source form, or draw fewer groups` : error.message);
  }
  const { props, report, direction } = built;
  console.log(`direction ${label}`);
  for (const d of direction.decisions ?? []) console.log(`  ${d.register.padEnd(8)} ${d.role.padEnd(15)} -> ${d.family}`);
  console.log(`  title form ${report.titleForm + 1} · source form ${report.sourceForm + 1} · bar ${report.barW}px · ${report.tiers} · head ${report.head} line(s)`);

  try {
    assertEventFramesReadable(GroupedBarFrame, props, SIZE, label);
  } catch (error) {
    throw new Error(`${error.message} — shorten the words that frame draws (group names, series names, unit, title forms, source forms)`);
  }
  for (const g of props.groups)
    for (const v of [g.wind, g.solar]) if (!(shareText(v, format) in props.shareWidths)) throw new Error(`${g.name}'s share ${shareText(v, format)} was not measured (a kit bug, not a beat.mjs one)`);

  const T = props.timing;
  const lookFrames = [
    { name: "first", frame: 0 },
    { name: "reference-mix", frame: Math.round(T.reference.start + T.reference.duration * 0.7) },
    ...[0.15, 0.45, 0.8].map((t) => ({ name: `reveal-${t}`, frame: Math.round(T.reveal.start + T.reveal.duration * t) })),
    { name: "subject-compare", frame: Math.round(T.subject.start + T.subject.duration * 0.6) },
    ...EVENT_ORDER.map((event) => ({ name: event === "hold" ? "final" : `end-${event}`, frame: Math.min(endOf(T[event]), T.total) - 1 })),
  ].sort((a, b) => a.frame - b.frame);
  const { wantedOf } = await import(skillScriptFrom(HERE, "chart-video", "scripts", "video-faces.mjs"));
  await renderBeatVideo({
    Frame: GroupedBarFrame,
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
