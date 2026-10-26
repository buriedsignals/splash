// The generic half of a bullet WEB beat, taken from
// proof/web-bullet-low-carbon-share/render-directions-web.mjs with everything about ITS subject
// removed. The interaction is the worked example's and is not the model's to change: one horizontal
// track per row (0–100 %), the measure bar on it, a target tick and the gap to that target (solid
// past it, hollow short of it) with a verdict chip per row; a "measure against" control changes the
// target of every row at once — each row's own earlier value (the plate), the threshold the claim
// names, the median of the rows, or the leader — and the ticks travel while the gaps and verdicts
// re-derive (CSS only, works without JS). Every row answers hover/tap/Tab with its detail. This file
// computes the targets, gaps and verdicts; ./beat.mjs — the one file the model writes — gives the
// rows and WORDS every reading. Copied into the beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { readFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { DirectedBulletWeb, rowFloorFor } from "./DirectedBulletWeb.tsx";
import { applyStoryboard, assertNumbers, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { chartWeb, plain, refusing, renderBeatWeb, storyLanguage } from "./web.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderWeb } = await import(chartWeb(HERE, "scripts", "render-web.mjs"));
  const { deriveFurniture, measureText } = await import(chartWeb(HERE, "scripts", "render-still.mjs"));
  const { assertOneBenchmark, benchmarkGapOf, benchmarkSlugOf, BENCHMARK_CLAIM_SLUG } = await import(chartWeb(HERE, "assets", "benchmark.ts"));

  const REQUIRED = ["eyebrow", "rows", "subject", "format", "detail", "verdict", "threshold", "thresholdLabel", "thresholdNote", "benchmarkLabel", "ownLabel", "ownAnnounce", "medianLabel", "leaderLabel", "announce", "note", "title", "limits", "reading", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["format", "detail", "verdict", "leaderLabel", "announce", "note", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);

  // ── the rows: a share in percent, then and now, one row per name ─────────────────────────────
  const SCALE_MAX = 100;
  assertNumbers(beat.rows.map((r) => [r.name, r.after]), "after values");
  assertNumbers(beat.rows.map((r) => [r.name, r.before]), "before values");
  if (beat.rows.length < 3 || beat.rows.length > 12) throw new Error(`rows holds ${beat.rows.length} rows: a bullet page compares 3 to 12 rows`);
  const names = new Set(beat.rows.map((r) => String(r.name)));
  if (names.size !== beat.rows.length) throw new Error(`rows holds the same name twice: one row per name`);
  const off = beat.rows.find((r) => r.before < 0 || r.after < 0 || r.before > SCALE_MAX || r.after > SCALE_MAX);
  if (off) throw new Error(`${off.name} is ${off.before} → ${off.after}: the track runs from 0 to ${SCALE_MAX} %, so give each value as a percentage share`);
  if (!names.has(beat.subject)) throw new Error(`subject ${JSON.stringify(beat.subject)} is not a row name; the names are ${[...names].join(", ")}`);
  if (!(beat.threshold > 0 && beat.threshold < SCALE_MAX)) throw new Error(`threshold is ${beat.threshold}: give the line the takeaway names, between 0 and ${SCALE_MAX}`);
  const claimText = plain([beat.title].flat()[0]);
  const thresholdLabel = plain(beat.thresholdLabel);
  if (!claimText.includes(thresholdLabel)) throw new Error(`thresholdLabel "${thresholdLabel}" must be words the title itself contains: the threshold is offered as a target only because the claim names it`);

  beat.check();
  assertDrawsClaimColumn(beat.rows.map((r) => r.after), HERE);

  // The plate's order: the largest change first. Keys in ids and selectors are the runner's own.
  const base = beat.rows
    .map((r) => ({ name: String(r.name), before: r.before, after: r.after, change: r.after - r.before }))
    .sort((a, b) => b.change - a.change)
    .map((r, i) => ({ ...r, code: `r${i + 1}` }));
  const subject = base.find((r) => r.name === beat.subject);
  const sortedAfter = base.map((r) => r.after).sort((a, b) => a - b);
  const mid = sortedAfter.length / 2;
  const median = sortedAfter.length % 2 ? sortedAfter[Math.floor(mid)] : (sortedAfter[mid - 1] + sortedAfter[mid]) / 2;
  const leader = base.reduce((best, r) => (r.after > best.after ? r : best));
  const flat = (v) => Object.fromEntries(base.map((r) => [r.code, v]));

  const TARGETS = [
    { key: "own", slug: BENCHMARK_CLAIM_SLUG, label: plain(beat.ownLabel), provenance: "own-earlier-value", at: Object.fromEntries(base.map((r) => [r.code, r.before])) },
    { key: "threshold", slug: benchmarkSlugOf("threshold"), label: thresholdLabel, provenance: "stated-in-the-claim", at: flat(beat.threshold), value: beat.threshold },
    { key: "median", slug: benchmarkSlugOf("median"), label: plain(beat.medianLabel), provenance: "a-statistic-of-the-drawn-set", at: flat(median), value: median },
    { key: "leader", slug: benchmarkSlugOf("leader"), label: plain(beat.leaderLabel({ name: leader.name, value: leader.after })), provenance: "a-statistic-of-the-drawn-set", at: flat(leader.after), value: leader.after },
  ];
  if (new Set(TARGETS.map((t) => t.label)).size !== TARGETS.length) throw new Error(`two targets carry the same label (${TARGETS.map((t) => t.label).join(" / ")}): give ownLabel, thresholdLabel, medianLabel and leaderLabel different words`);

  // ── every row's verdict under every target ───────────────────────────────────────────────────
  const verdictsUnder = (target) =>
    base.map((r) => {
      const { gap, verdict } = benchmarkGapOf(r.after, target.at[r.code]);
      const words = { name: r.name, after: r.after, before: r.before, change: r.change, target: target.at[r.code], gap, verdict, key: target.key };
      const text = plain(beat.verdict(words));
      const label = plain(beat.format(r.after));
      if (!text.includes(label)) throw new Error(`verdict() is printed on ${r.name}'s row, so it must state its value, format(after) = "${label}"; it says: ${text}`);
      return { ...words, code: r.code, text };
    });
  const underTarget = new Map(TARGETS.map((t) => [t.slug, verdictsUnder(t)]));
  const clears = (slug) => underTarget.get(slug).filter((v) => v.verdict !== "short");
  const distinct = new Set(TARGETS.map((t) => clears(t.slug).length));
  if (distinct.size < 3)
    throw new Error(`the four targets sort the ${base.length} rows into only ${distinct.size} different counts of rows that clear them (${TARGETS.map((t) => `${t.label}: ${clears(t.slug).length}`).join(", ")}) — four targets that give the same verdicts are not four questions; this data does not carry the bullet's benchmark control`);

  const rows = base.map((r) => ({
    code: r.code,
    name: r.name,
    before: r.before,
    after: r.after,
    change: r.change,
    afterLabel: plain(beat.format(r.after)),
    detail: plain(beat.detail({ name: r.name, before: r.before, after: r.after, change: r.change })),
    verdicts: TARGETS.map((t) => ({ slug: t.slug, text: underTarget.get(t.slug).find((v) => v.code === r.code).text })),
  }));

  // ── the control's words ───────────────────────────────────────────────────────────────────────
  const optionFacts = (t) => {
    const vs = underTarget.get(t.slug);
    const over = vs.filter((v) => v.verdict !== "short");
    const short = vs.filter((v) => v.verdict === "short");
    const pick = ({ name, after, before, change, gap, verdict }) => ({ name, after, before, change, gap, verdict });
    return {
      key: t.key,
      label: t.label,
      value: t.value,
      count: base.length,
      clears: over.length,
      short: short.length,
      verdicts: vs.map(pick),
      nearestOver: over.length ? pick(over.reduce((a, b) => (b.gap < a.gap ? b : a))) : null,
      nearestShort: short.length ? pick(short.reduce((a, b) => (b.gap > a.gap ? b : a))) : null,
      median,
      leader: { name: leader.name, value: leader.after },
      subject: pick(vs.find((v) => v.name === subject.name)),
    };
  };
  const benchmark = {
    label: plain(beat.benchmarkLabel),
    claimText,
    claim: { label: TARGETS[0].label, announce: plain(beat.ownAnnounce), provenance: TARGETS[0].provenance, at: TARGETS[0].at },
    options: TARGETS.slice(1).map((t) => {
      const facts = optionFacts(t);
      const option = { key: t.key, label: t.label, announce: plain(beat.announce(facts)), note: plain(beat.note(facts)), provenance: t.provenance, at: t.at };
      if (!option.note.includes(String(facts.clears)))
        throw new Error(`note() is shown when the target is ${t.label}, so it must state how many rows clear it (clears = ${facts.clears}); it says: ${option.note}`);
      return option;
    }),
  };
  if (!benchmark.claim.announce.includes(benchmark.claim.label)) throw new Error(`ownAnnounce must contain ownLabel "${benchmark.claim.label}"; it says: ${benchmark.claim.announce}`);

  // The title may state the threshold, the subject's values or a change the plate draws.
  assertHeadlineNumbersDrawn(claimText, [...base.flatMap((r) => [r.before, r.after, r.change]), beat.threshold, median], "rows");

  // Ticks: round steps of the 0–100 track, one of them at the threshold (its name is keyed to it).
  const xTicks = [25, 20, 10, 50, 5].map((s) => Array.from({ length: SCALE_MAX / s + 1 }, (_, i) => i * s)).find((ticks) => ticks.includes(beat.threshold));
  if (!xTicks) throw new Error(`threshold ${beat.threshold} falls on no round tick of the 0–100 track (multiples of 5): the threshold's name is keyed to its own tick`);

  const caveat = plain([beat.limits].flat()[0]);
  const source = plain(beat.source);
  const reading = plain(beat.reading);
  const eyebrow = plain(beat.eyebrow);
  const alt = plain(beat.alt);
  const thresholdNote = plain(beat.thresholdNote);

  const facts = beatFacts(rows.map((r) => ({ key: r.code, label: r.name, value: r.after })), { subject: subject.name, markers: rows.map((r) => ({ key: r.code, label: r.name, value: r.before })), declaredSequence: "%" });
  applicableTreatments(facts);

  const textPerRegister = {
    display: claimText,
    eyebrow,
    body: `${caveat} ${reading} ${source}`,
    axis: `${xTicks.join(" ")} % ${rows.map((r) => r.name).join(" ")} ${benchmark.label} ${TARGETS.map((t) => t.label).join(" ")}`,
    annot: `${thresholdNote} ${benchmark.options.map((o) => o.note).join(" ")}`,
    value: rows.flatMap((r) => r.verdicts.map((v) => v.text)).join(" "),
  };

  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  await renderBeatWeb({
    here: HERE,
    textPerRegister,
    evidenceLevels: beat.evidenceLevels ?? 3,
    async render({ label, direction, outDir }) {
      const furniture = deriveFurniture(direction.ground);
      const { floor: rowFloor } = rowFloorFor({ rows, subject: subject.code, direction, ink: { ink: furniture.ink, muted: furniture.muted, accent: direction.accent }, measure: measureText });
      const result = await renderWeb({
        lang,
        component: DirectedBulletWeb,
        props: {
          rows,
          subject: subject.code,
          benchmark,
          scaleMax: SCALE_MAX,
          threshold: beat.threshold,
          thresholdNote,
          xTicks,
          title: claimText,
          eyebrow,
          caveat,
          source,
          reading,
          alt,
          direction,
          rowFloor,
          ground: direction.ground,
          accent: direction.accent,
          nameValueSeparator: /^fr\b/.test(lang) ? " : " : ": ",
        },
        outDir,
        name: `${label}.html`,
        rowFloor,
      });
      // Read the written page back: one state shown at a time, every row's verdict present.
      assertOneBenchmark(readFileSync(result.outPath, "utf8"), benchmark, rows.map((r) => ({ key: r.code, value: r.after })));
      return result;
    },
  });
});
