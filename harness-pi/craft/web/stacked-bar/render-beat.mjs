// The generic half of a stacked-bar WEB beat, taken from
// proof/web-stacked-bar-lowcarbon-growth/render-directions-web.mjs with everything about ITS subject
// removed. The interaction is the worked example's and is not the model's to change: one horizontal
// bar per member, stacked by band in ONE order, a tick at each bar's earlier total; every segment
// answers hover/tap/Tab with its band, its rank among the members on that band, its share of the bar
// and its earlier value; and a "rebase" control lets the reader put any one band the stack misranks
// on a common baseline — a rail under every bar, from zero to that band's value (CSS only, works
// without JS). This file computes the stack, the ranks and the misread pairs; ./beat.mjs — the one
// file the model writes — gives the data and WORDS every reading. Copied into the beat by the
// harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { readFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { scaleLinear } from "d3-scale";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { contrast, mix, NON_TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";
import { DirectedStackedBarWeb } from "./DirectedStackedBarWeb.tsx";
import { applyStoryboard, assertNumbers, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { chartWeb, plain, refusing, renderBeatWeb, storyLanguage } from "./web.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The most bands DirectedStackedBarWeb's ramp keeps 1.2:1 apart for this accent (its own loop). */
function maxBands(accent, ground) {
  for (let tones = 5; tones > 2; tones -= 1) {
    const top = contrast(accent, ground);
    const ramp = Array.from({ length: tones }, (_, i) => {
      const target = top * Math.pow(NON_TEXT_CONTRAST_MIN / top, i / (tones - 1));
      for (let step = 0; step <= 400; step++) {
        const candidate = mix(ground, accent, step / 400);
        if (contrast(candidate, ground) >= target) return candidate;
      }
      return accent;
    });
    if (ramp.every((c, i) => i === 0 || contrast(c, ramp[i - 1]) >= 1.2)) return tones;
  }
  return 2;
}

await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderWeb } = await import(chartWeb(HERE, "scripts", "render-web.mjs"));
  const { assertOneRebasing, rebaseInversions, rebaseWorstMisread } = await import(chartWeb(HERE, "assets", "rebase.ts"));

  const REQUIRED = ["eyebrow", "bands", "rows", "highlight", "unit", "format", "totalLabel", "detail", "beforeLabel", "rebaseLabel", "noneLabel", "noneAnnounce", "announce", "note", "title", "limits", "reading", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["format", "totalLabel", "detail", "announce", "note", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);

  // ── the bands, in ONE stacking order (the first sits on the baseline) ────────────────────────
  if (!Array.isArray(beat.bands) || beat.bands.length < 2) throw new Error(`bands holds ${beat.bands?.length ?? 0} entries; a stack needs at least two`);
  if (beat.bands.length > 5)
    throw new Error(`bands holds ${beat.bands.length} entries; past five a stack is an unreadable ribbon — group the smallest into one "other" band (sum their columns)`);
  const bandKeys = beat.bands.map((b) => String(b.key));
  if (new Set(bandKeys).size !== bandKeys.length) throw new Error(`two bands share one key`);
  for (const b of beat.bands) if (typeof b.name !== "string" || !b.name.trim()) throw new Error(`band ${b.key} has no name (the legend's words)`);

  // ── the rows: one bar per member, a value per band now and earlier ───────────────────────────
  if (!Array.isArray(beat.rows) || beat.rows.length < 2) throw new Error(`rows holds ${beat.rows?.length ?? 0} members; draw at least two bars`);
  if (beat.rows.length > 20) throw new Error(`rows holds ${beat.rows.length} members; draw at most 20 bars (keep the ones the takeaway is about, and say how many of how many in limits)`);
  const names = beat.rows.map((r) => String(r.name));
  if (new Set(names).size !== names.length) throw new Error(`two rows share one name: one row per bar`);
  for (const r of beat.rows) {
    for (const side of ["values", "earlier"]) {
      if (!r[side] || typeof r[side] !== "object") throw new Error(`row ${r.name} has no ${side}: give it { name, values: { <band key>: number }, earlier: { <band key>: number } }`);
      const extra = Object.keys(r[side]).filter((k) => !bandKeys.includes(k));
      if (extra.length) throw new Error(`row ${r.name}'s ${side} names ${extra.join(", ")}, which is not a band key (${bandKeys.join(", ")})`);
      assertNumbers(bandKeys.map((k) => [`${r.name} ${side}.${k}`, r[side][k]]));
      if (bandKeys.some((k) => r[side][k] < 0)) throw new Error(`row ${r.name} holds a negative ${side} value: a stack adds lengths from zero`);
    }
  }
  const highlight = [beat.highlight].flat().map(String);
  const absent = highlight.filter((h) => !names.includes(h));
  if (!highlight.length) throw new Error(`highlight must name at least one bar (the one the takeaway is about)`);
  if (absent.length) throw new Error(`highlight names ${absent.join(", ")}, which is not the name of any row; the rows are ${names.join(", ")}`);
  if (highlight.length > 2) throw new Error(`highlight names ${highlight.length} bars; the accent marks one bar or one pair`);

  beat.check();
  assertDrawsClaimColumn(beat.rows.flatMap((r) => bandKeys.map((k) => r.values[k])), HERE);

  const sum = (o) => bandKeys.reduce((s, k) => s + o[k], 0);
  const rows = beat.rows
    .map((r) => ({ name: String(r.name), by: r.values, wasBy: r.earlier, total: sum(r.values), before: sum(r.earlier) }))
    .map((r) => ({ ...r, added: r.total - r.before }))
    .sort((a, b) => b.total - a.total)
    .map((r, i) => ({ ...r, code: `r${i + 1}` }));
  if (rows.some((r) => !(r.total > 0))) throw new Error(`a row adds up to 0: every bar needs a length`);

  // ── the scale: round ticks, the frame's top half a step above the longest bar ─────────────────
  const longest = Math.max(...rows.map((r) => r.total), ...rows.map((r) => r.before));
  const ticks = scaleLinear().domain([0, longest]).ticks(5);
  const step = ticks[1] - ticks[0];
  const span = Math.ceil(longest / (step / 2)) * (step / 2);
  const xTicks = Array.from({ length: Math.floor(span / step + 1e-9) + 1 }, (_, i) => +(i * step).toFixed(10));

  const stacked = new Map(
    rows.map((r) => {
      let cursor = 0;
      const bands = new Map();
      for (const k of bandKeys) {
        const v = r.by[k];
        bands.set(k, { from: cursor, to: cursor + v, value: v });
        cursor += v;
      }
      return [r.code, bands];
    }),
  );
  const rankOn = new Map(bandKeys.map((k) => [k, new Map([...rows].sort((a, b) => b.by[k] - a.by[k]).map((r, i) => [r.code, i + 1]))]));

  const shaped = rows.map((r) => {
    const segments = beat.bands
      .map((band, tone) => {
        const k = String(band.key);
        const seg = stacked.get(r.code).get(k);
        const v = seg.value;
        const was = r.wasBy[k];
        const reading = { name: r.name, band: band.name, value: v, rank: rankOn.get(k).get(r.code), count: rows.length, share: (v / r.total) * 100, earlier: was, change: v - was, existed: was > 0 };
        return { key: k, tone, from: seg.from, to: seg.to, label: (v / span) * 100 > 6 ? plain(beat.format(v)) : null, detail: plain(beat.detail(reading)) };
      })
      .filter((s) => s.to > s.from);
    const totalLabel = plain(beat.totalLabel({ name: r.name, total: r.total, before: r.before, added: r.added }));
    const total = plain(beat.format(r.total));
    if (!totalLabel.includes(total)) throw new Error(`totalLabel() is printed at the end of ${r.name}'s bar, so it must state its total, format(total) = "${total}"; it says: ${totalLabel}`);
    return { code: r.code, name: plain(r.name), total: r.total, before: r.before, totalLabel, segments, highlight: highlight.includes(r.name) };
  });

  // ── the rails: a band is offered only when the stack misranks it on every bar it is drawn on ──
  const nameOf = new Map(rows.map((r) => [r.code, r.name]));
  const offered = [];
  const skipped = [];
  beat.bands.forEach((band) => {
    const k = String(band.key);
    const bands = shaped.map((r) => {
      const seg = stacked.get(r.code).get(k);
      return { row: r.code, value: seg.value, from: seg.from };
    });
    if (bands.some((b) => !(b.value > 0))) return skipped.push(`${band.name} (0 on some bar: no rail can stand under a band that is not drawn)`);
    const { inverted, pairs } = rebaseInversions(bands);
    const worst = rebaseWorstMisread(bands);
    if (!worst || inverted === 0) return skipped.push(`${band.name} (the stack already ranks it right)`);
    const end = (b) => b.from + b.value;
    const o = {
      band: band.name,
      label: plain(band.label ?? band.name),
      inverted,
      pairs,
      longer: { name: nameOf.get(worst.longer.row), value: worst.longer.value, end: end(worst.longer) },
      righter: { name: nameOf.get(worst.righter.row), value: worst.righter.value, end: end(worst.righter) },
    };
    const option = { key: k, label: o.label, announce: plain(beat.announce(o)), note: plain(beat.note(o)), bands };
    if (!option.announce.includes(option.label)) throw new Error(`announce() must contain the option's label (${option.label}); it says: ${option.announce}`);
    if (!new RegExp(`(?<![\\d.,])${inverted}(?![\\d.,]\\d)`).test(option.note))
      throw new Error(`note() for ${band.name} must state how many pairs the stack ranks backwards (${inverted}, from o.inverted); it says: ${option.note}`);
    offered.push(option);
  });
  if (skipped.length) console.log(`rebase: not offered — ${skipped.join("; ")}`);
  if (!offered.length) throw new Error(`no band is misranked by the stack, so the rebase control would offer nothing: every band already reads right — draw it as a static stacked bar`);
  const noneLabel = plain(beat.noneLabel);
  const noneAnnounce = plain(beat.noneAnnounce);
  if (!noneAnnounce.includes(noneLabel)) throw new Error(`noneAnnounce must contain noneLabel (${noneLabel}); it says: ${noneAnnounce}`);
  const rebase = { label: plain(beat.rebaseLabel), axisMax: span, options: [{ key: "none", label: noneLabel, announce: noneAnnounce, bands: [] }, ...offered] };

  // The title may state what a bar added (total − earlier total) — a figure the plate carries as
  // the distance from the tick to the bar's end, printed in every total label.
  assertHeadlineNumbersDrawn([beat.title].flat()[0], [...rows.flatMap((r) => bandKeys.map((k) => r.by[k])), ...rows.map((r) => r.total), ...rows.map((r) => r.added)], "bars");

  const title = plain([beat.title].flat()[0]);
  const caveat = plain([beat.limits].flat()[0]);
  const source = plain(beat.source);
  const reading = plain([beat.reading].flat()[0]);
  const eyebrow = plain(beat.eyebrow);
  const unit = plain(beat.unit);
  const beforeLabel = plain(beat.beforeLabel);
  const alt = plain(beat.alt);
  const toneLabels = beat.bands.map((b) => plain(b.name));

  const facts = beatFacts(rows.map((r) => ({ key: r.code, label: r.name, value: r.total })), { subject: highlight[0], declaredSequence: unit });
  applicableTreatments(facts);

  const textPerRegister = {
    display: title,
    eyebrow,
    body: `${caveat} ${reading} ${source} ${toneLabels.join(" ")}`,
    axis: `${xTicks.join(" ")} ${shaped.map((r) => r.name).join(" ")} ${rebase.label} ${rebase.options.map((o) => o.label).join(" ")}`,
    annot: `${beforeLabel} ${offered.map((o) => o.note).join(" ")}`,
    value: shaped.map((r) => r.totalLabel).join(" "),
  };

  const interaction = {
    earns:
      `A still has to pick the one comparison a stack supports and ask to be trusted about the rest; ` +
      `this page hands the missing baseline back one band at a time (${offered.length} of the ${beat.bands.length} bands), without moving the stack, ` +
      `and lets the reader go back and forth between two rankings of the same ${rows.length} bars.`,
    controls: [
      {
        question: "How much of each bar is this band, and who else has as much of it?",
        gesture: "toggle-a-comparison",
        changes: "A rail grows under every bar, from zero to the chosen band's value on the plate's own scale; the stack itself does not move a pixel.",
        parameter: "the band brought back to a zero baseline",
        authorPicked: "none",
        readerPicks: ["none", ...offered.map((o) => o.key.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""))],
        heldStill: [".chart-header", ".chart-source"],
      },
      {
        question: "What is this segment worth, and where does it rank among the members?",
        gesture: "ask-a-mark",
        changes: "The segment pointed at darkens from its own fill and answers with its band, its value, its rank, its share of the bar and its earlier value.",
        parameter: "which segment is asked about",
        authorPicked: toneLabels[1] ?? toneLabels[0],
        readerPicks: "every mark",
        heldStill: [".chart-header", ".chart-source"],
      },
    ],
  };

  await renderBeatWeb({
    here: HERE,
    textPerRegister,
    evidenceLevels: beat.evidenceLevels ?? 6,
    async render({ label, direction, outDir }) {
      // The stack's bands are ONE hue shaded from the accent down to the non-text floor, and the
      // component refuses two neighbours closer than 1.2:1. How many bands that leaves depends on
      // the story's accent, so the count is measured here (the component's own ramp) and the
      // refusal says what to change in beat.mjs.
      const fits = maxBands(direction.accent, direction.ground);
      if (beat.bands.length > fits)
        throw new Error(`this story's accent ${direction.accent} on ${direction.ground} can shade only ${fits} bands a reader tells apart, and bands holds ${beat.bands.length}: merge the smallest bands into one (sum their values) until bands holds ${fits}`);
      const { outPath } = await renderWeb({
        lang: beat.lang ?? storyLanguage(HERE) ?? "en",
        component: DirectedStackedBarWeb,
        props: {
          rows: shaped,
          tones: beat.bands.length,
          toneLabels,
          span,
          xTicks,
          beforeLabel,
          rebase,
          interaction,
          title,
          eyebrow,
          caveat,
          source,
          reading,
          alt,
          direction,
          ground: direction.ground,
          accent: direction.accent,
        },
        outDir,
        name: `${label}.html`,
      });
      // The two refusals only the WRITTEN page can carry, as the worked example's runner makes them.
      assertOneRebasing(await readFile(outPath, "utf8"), rebase, { rows: shaped.map((r) => r.code), where: label });
      return { outPath };
    },
  });
});
