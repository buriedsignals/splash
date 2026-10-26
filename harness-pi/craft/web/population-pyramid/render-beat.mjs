// The generic half of a population-pyramid WEB beat, taken from
// proof/web-population-pyramid-switzerland/render-directions-web.mjs with everything about ITS
// subject removed. The interaction is the worked example's and is not the model's to change: a
// "fold one half" control lays one half's silhouette over the other as a solid staircase, both ways
// round (CSS only, works without JS), and a chip names the band where the outline crosses the bars it
// lies on; every band answers hover/tap/Tab with both counts, its total, the gap between the halves
// and its share of the population. This file finds the widest band, the crossing and the runs of each
// half's lead; ./beat.mjs — the one file the model writes — gives the bands and WORDS every reading.
// Copied into the beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { readFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { skillScriptFrom } from "#shared/design-base/skill-script.mjs";
import { DirectedPyramidWeb } from "./DirectedPyramidWeb.tsx";
import { applyStoryboard, assertNumbers, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { chartWeb, plain, refusing, renderBeatWeb, storyLanguage } from "./web.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderWeb } = await import(chartWeb(HERE, "scripts", "render-web.mjs"));
  const { assertFoldChangesThePicture, foldSlugOf } = await import(skillScriptFrom(HERE, "chart-web", "assets", "fold.ts"));

  const REQUIRED = ["eyebrow", "bands", "leftName", "rightName", "peakLabel", "detail", "foldLabel", "noneLabel", "foldPill", "announce", "note", "crossingText", "title", "limits", "reading", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")} (see CONTRACT.md)`);
  for (const fn of ["peakLabel", "detail", "foldPill", "announce", "note", "crossingText", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  if (beat.tickFormat !== undefined && typeof beat.tickFormat !== "function") throw new Error(`beat.mjs: tickFormat must be a function (see CONTRACT.md)`);

  // ── the bands, youngest first ─────────────────────────────────────────────────────────────────
  assertNumbers(beat.bands.flatMap((b) => [[`${b.band} left`, b.left], [`${b.band} right`, b.right]]), "band counts");
  if (beat.bands.length < 5 || beat.bands.length > 30) throw new Error(`bands holds ${beat.bands.length} age bands; a pyramid draws 5 to 30 (filter data.json to one year and one population)`);
  const names = beat.bands.map((b) => String(b.band));
  if (new Set(names).size !== names.length) throw new Error(`two rows share the band ${names.find((n, i) => names.indexOf(n) !== i)}: filter data.json to ONE year and one population so each band is one row`);
  const negative = beat.bands.find((b) => b.left < 0 || b.right < 0);
  if (negative) throw new Error(`${negative.band} has a negative count: a pyramid's halves are counts, drawn outward from the centre`);
  const L = plain(beat.leftName);
  const R = plain(beat.rightName);
  // The two names are the fold's option keys and a CSS attribute value in the component.
  for (const n of [L, R]) {
    if (!foldSlugOf(n)) throw new Error(`side name "${n}" has no Latin letter or digit, so the fold control cannot key it: write leftName/rightName with at least one`);
    if (/["\\]/.test(n)) throw new Error(`side name "${n}" holds a quote or a backslash: write leftName/rightName without them`);
  }
  if (foldSlugOf(L) === foldSlugOf(R)) throw new Error(`leftName and rightName key to the same slug ("${foldSlugOf(L)}"): name the two halves differently`);

  const rows = beat.bands.map((b) => ({ band: plain(b.band), left: b.left, right: b.right }));
  const total = rows.reduce((s, r) => s + r.left + r.right, 0);
  const widest = rows.reduce((a, b) => (b.left + b.right > a.left + a.right ? b : a));
  const youngest = rows[0];

  // ── who leads each band, and the runs of that lead ───────────────────────────────────────────
  // A tie leads nobody and does not break a run.
  const leaderOf = (r) => (r.right > r.left ? R : r.left > r.right ? L : null);
  const runs = [];
  rows.forEach((r) => {
    const leader = leaderOf(r);
    if (leader === null) {
      if (runs.length) runs[runs.length - 1].ties += 1;
      return;
    }
    const gap = Math.abs(r.right - r.left);
    const run = runs[runs.length - 1];
    if (run && run.leader === leader) {
      run.to = r.band;
      run.count += 1;
      if (gap > run.widest.gap) run.widest = { band: r.band, gap };
    } else runs.push({ leader, from: r.band, to: r.band, count: 1, ties: 0, widest: { band: r.band, gap } });
  });
  if (runs.length < 2)
    throw new Error(`${runs[0]?.leader ?? "neither half"} leads every band: the two halves never change places, so the fold has no crossing to name and is not this beat's gesture — say the lead in the title and draw a static pyramid`);
  if (runs.length > 4)
    throw new Error(`the lead changes ${runs.length - 1} times (${runs.slice(1).map((r) => r.from).join(", ")}): a fold's crossing would be one of many and its sentences could not say where the halves swap — use wider bands or a static pyramid`);
  const crossings = runs.slice(1).map((r) => r.from);
  const crossing = rows.find((r) => r.band === crossings[0]);
  const widestGap = rows.reduce((a, b) => (Math.abs(b.right - b.left) > Math.abs(a.right - a.left) ? b : a));
  const sideTotal = { [L]: rows.reduce((s, r) => s + r.left, 0), [R]: rows.reduce((s, r) => s + r.right, 0) };

  const bandReading = (r) => {
    const bandTotal = r.left + r.right;
    return { band: r.band, left: r.left, right: r.right, total: bandTotal, share: (bandTotal / total) * 100, gap: Math.abs(r.right - r.left), leader: leaderOf(r), isPeak: r.band === widest.band, isYoungest: r.band === youngest.band };
  };
  const checkArgs = { bands: rows.map(bandReading), widest: bandReading(widest), youngest: bandReading(youngest), runs, crossings, total };
  beat.check(checkArgs);
  assertDrawsClaimColumn(rows.flatMap((r) => [r.left, r.right]), HERE);
  assertHeadlineNumbersDrawn([beat.title].flat()[0], [...rows.flatMap((r) => [r.left, r.right, r.left + r.right]), total], "bands");

  const bands = rows.map((r) => ({ key: r.band, left: r.left, right: r.right, peak: r.band === widest.band, detail: plain(beat.detail(bandReading(r))) }));
  if (new Set(bands.map((b) => b.detail)).size !== bands.length) throw new Error(`two bands answer with the same words: detail() must start with the band`);

  // ── the fold, both ways round ──────────────────────────────────────────────────────────────────
  const foldReading = (side) => {
    const host = side === L ? R : L;
    return {
      name: side,
      host,
      first: rows[0].band,
      last: rows.at(-1).band,
      crossing: { band: crossing.band, gap: Math.abs(crossing.right - crossing.left), leader: leaderOf(crossing) },
      crossings,
      runs,
      ahead: rows.filter((r) => leaderOf(r) === side).length,
      behind: rows.filter((r) => leaderOf(r) === host).length,
      widestGap: { band: widestGap.band, gap: Math.abs(widestGap.right - widestGap.left), leader: leaderOf(widestGap) },
      total: sideTotal[side],
      hostTotal: sideTotal[host],
    };
  };
  const foldPlan = {
    label: plain(beat.foldLabel),
    noneLabel: plain(beat.noneLabel),
    options: [L, R].map((side) => {
      const f = foldReading(side);
      const option = { key: side, host: f.host, label: plain(beat.foldPill(f)), announce: plain(beat.announce(f)), note: plain(beat.note(f)), crossing: { key: crossing.band, text: plain(beat.crossingText(f)) } };
      if (!option.announce.includes(option.label)) throw new Error(`announce() must contain the pill's words "${option.label}" word for word (a screen reader speaks it); it says: ${option.announce}`);
      if (!option.crossing.text.includes(crossing.band)) throw new Error(`crossingText() is printed at the band ${crossing.band}, so it must name that band; it says: ${option.crossing.text}`);
      return option;
    }),
  };

  // ── the scale: a round step for THIS data's widest half ───────────────────────────────────────
  const most = Math.max(...rows.flatMap((r) => [r.left, r.right]));
  const step = 10 ** Math.floor(Math.log10(most)) / 2;
  const span = Math.ceil(most / step) * step;
  const xTicks = [-span, -span / 2, 0, span / 2, span];
  const tickFormat = beat.tickFormat ? (t) => plain(beat.tickFormat(Math.abs(t))) : (t) => (span >= 10000 ? `${Math.abs(t) / 1000}k` : String(Math.abs(t)));

  const title = plain([beat.title].flat()[0]);
  const caveat = plain([beat.limits].flat()[0]);
  const source = plain(beat.source);
  const reading = plain(beat.reading);
  const eyebrow = plain(beat.eyebrow);
  const peakNote = plain(beat.peakLabel(bandReading(widest)));
  if (peakNote.length > 40) throw new Error(`peakLabel() prints "${peakNote}" (${peakNote.length} characters) in the gutter beside the widest band — keep it under 40 ("55-59: 669,962 people")`);
  const alt = plain(typeof beat.alt === "function" ? beat.alt(checkArgs) : beat.alt);

  // The worked example declares no interaction plan to renderWeb (its fold vocabulary is measured by
  // assertFoldChangesThePicture below, not by the plan census), and the kit keeps it that way.

  const facts = beatFacts(rows.map((r) => ({ key: r.band, label: r.band, value: r.left + r.right })), { subject: widest.band, declaredSequence: plain(beat.unit ?? "count") });
  applicableTreatments(facts);

  const foldWords = foldPlan.options.map((o) => `${o.label} ${o.announce} ${o.note} ${o.crossing.text}`).join(" ");
  const textPerRegister = {
    display: title,
    eyebrow,
    body: `${caveat} ${reading} ${source} ${L} ${R} ${foldPlan.label} ${foldPlan.noneLabel} ${foldWords}`,
    axis: `${bands.map((b) => b.key).join(" ")} ${xTicks.map((t) => (t === 0 ? "0" : tickFormat(t))).join(" ")}`,
    annot: `${peakNote} ${foldPlan.options.map((o) => o.crossing.text).join(" ")}`,
    value: rows.map((r) => plain(`${(beat.format ?? String)(r.left)} ${(beat.format ?? String)(r.right)}`)).join(" "),
  };

  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  await renderBeatWeb({
    here: HERE,
    textPerRegister,
    evidenceLevels: beat.evidenceLevels ?? 2,
    async render({ label, direction, outDir }) {
      const out = await renderWeb({
        lang,
        component: DirectedPyramidWeb,
        props: {
          bands,
          span,
          xTicks,
          sideLabels: { left: L, right: R },
          foldPlan,
          peakNote,
          title,
          eyebrow,
          caveat,
          source,
          reading,
          alt,
          direction,
          ground: direction.ground,
          accent: direction.accent,
          tickFormat,
          peakNoteBreak: /^fr\b/.test(lang) ? " : " : ": ",
        },
        outDir,
        name: `${label}.html`,
      });
      // The worked example measures the written page: the fold must change the picture.
      assertFoldChangesThePicture(readFileSync(out.outPath, "utf8"), foldPlan, `renders/${label}.html`);
      return out;
    },
  });
});
