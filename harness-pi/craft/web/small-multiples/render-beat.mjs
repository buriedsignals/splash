// The generic half of a small-multiples WEB beat, taken from
// proof/web-small-multiples-solar-eu-six/render-directions-web.mjs with everything about ITS subject
// removed. The interaction is the worked example's and is not the model's to change: one panel per
// member on ONE shared scale, every panel answers hover/tap/Tab with its two ends, its factor and its
// rank, and a "carry" control lets the reader stamp one member's own curve into every panel at once,
// so the crossings the grid's frames hide (who was above whom, for how long, when the order changed)
// become visible; each panel then prints its verdict against the carried member (CSS only, works
// without JS). This file computes those crossings; ./beat.mjs — the one file the model writes — gives
// the panels and WORDS every reading. Copied into the beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { DirectedSmallMultiplesWeb } from "./DirectedSmallMultiplesWeb.tsx";
import { applyStoryboard, assertNumbers, assertOnePerX, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { chartWeb, plain, refusing, renderBeatWeb, storyLanguage } from "./web.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderWeb } = await import(chartWeb(HERE, "scripts", "render-web.mjs"));

  const REQUIRED = ["eyebrow", "panels", "ceiling", "thread", "format", "detail", "carryLabel", "noneLabel", "noneAnnounce", "announce", "note", "verdict", "sharedNote", "title", "limits", "reading", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["format", "detail", "announce", "note", "verdict", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  if (beat.optionLabel !== undefined && typeof beat.optionLabel !== "function")
    throw new Error(`beat.mjs: optionLabel must be a function of a panel's name (see CONTRACT.md)`);

  // ── the panels: every member on the same years, one value per year ───────────────────────────
  if (!Array.isArray(beat.panels) || beat.panels.length < 2) throw new Error(`panels holds ${beat.panels?.length ?? 0} members; a grid needs at least two`);
  if (beat.panels.length > 12) throw new Error(`panels holds ${beat.panels.length} members; draw at most 12 (keep the ones the takeaway is about, and say how many of how many in limits)`);
  const names = beat.panels.map((p) => String(p.name));
  if (new Set(names).size !== names.length) throw new Error(`two panels have the same name: give each member ONE panel`);
  for (const p of beat.panels) {
    if (!Array.isArray(p.series)) throw new Error(`panel ${p.name} has no series: give it { name, series: [{ year, value }] }`);
    assertNumbers(p.series.map((s) => [`${p.name} ${s.year}`, s.value]));
    assertOnePerX(p.series);
  }
  const years = [...beat.panels[0].series].sort((a, b) => a.year - b.year).map((s) => s.year);
  if (years.length < 3) throw new Error(`the panels hold ${years.length} years; a small multiple of lines needs at least 3`);
  for (const p of beat.panels) {
    const own = [...p.series].sort((a, b) => a.year - b.year).map((s) => s.year);
    if (own.length !== years.length || own.some((y, i) => y !== years[i]))
      throw new Error(`panel ${p.name} covers ${own[0]}–${own[own.length - 1]} (${own.length} years) and ${beat.panels[0].name} covers ${years[0]}–${years[years.length - 1]} (${years.length}): every panel must hold the same years — filter data.json to the years they all have`);
    if (p.series.some((s) => s.value < 0)) throw new Error(`panel ${p.name} holds a negative value: the panels are drawn from zero`);
  }
  const max = Math.max(...beat.panels.flatMap((p) => p.series.map((s) => s.value)));
  if (!(beat.ceiling >= max)) throw new Error(`ceiling is ${beat.ceiling}, below the largest value ${max}: the shared scale must hold every panel (compute it from the data, e.g. Math.ceil(max))`);
  if (beat.ceiling > max * 3) throw new Error(`ceiling is ${beat.ceiling}, more than three times the largest value ${max}: every panel would be flat — compute it just above the largest value`);
  const thread = [beat.thread].flat().map(String);
  const strangers = thread.filter((t) => !names.includes(t));
  if (strangers.length) throw new Error(`thread names ${strangers.join(", ")}, which is not a panel name (${names.join(", ")})`);
  if (thread.length > 2) throw new Error(`thread names ${thread.length} panels; the accent marks one panel or one pair`);

  beat.check();
  assertDrawsClaimColumn(beat.panels.flatMap((p) => p.series.map((s) => s.value)), HERE);

  // ── the members, as the worked example reads them: ordered by the last year's value ───────────
  const rows = beat.panels
    .map((p) => {
      const series = [...p.series].sort((a, b) => a.year - b.year).map((s) => ({ year: s.year, value: s.value }));
      const from = series[0].value;
      const to = series[series.length - 1].value;
      return { name: String(p.name), series, from, to, factor: from > 0 ? to / from : null };
    })
    .sort((a, b) => b.to - a.to)
    .map((r, i) => ({ ...r, code: `p${i + 1}` }));
  const first = years[0];
  const last = years[years.length - 1];
  const optionLabel = (name) => plain(beat.optionLabel ? beat.optionLabel(name) : name);

  // For every ordered pair of panels: where the host stands against the guest each year, where
  // that changes, and the longest run the host spent above.
  const values = (row) => row.series.map((s) => s.value);
  const standing = (host, guest) => {
    const h = values(host);
    const g = values(guest);
    const above = h.map((v, i) => v > g[i]);
    const turns = [];
    for (let i = 1; i < above.length; i += 1) if (above[i] !== above[i - 1]) turns.push(years[i]);
    let best = { length: 0, from: null, to: null };
    let run = 0;
    for (let i = 0; i < above.length; i += 1) {
      run = above[i] ? run + 1 : 0;
      if (run > best.length) best = { length: run, from: years[i - run + 1], to: years[i] };
    }
    return { above, turns, run: best };
  };

  const panels = rows.map((r, i) => {
    const reading = { name: r.name, from: r.from, to: r.to, firstYear: first, lastYear: last, factor: r.factor, rank: i + 1, count: rows.length, series: r.series };
    return {
      code: r.code,
      name: plain(r.name),
      series: r.series,
      endLabel: plain(beat.format(r.to)),
      highlight: thread.includes(r.name),
      detail: plain(beat.detail(reading)),
    };
  });

  // ── the carry: one option per member some other member crosses ────────────────────────────────
  const options = [];
  const dropped = [];
  for (const guest of rows) {
    const others = rows.filter((r) => r.code !== guest.code);
    const read = others.map((host) => ({ host, ...standing(host, guest) }));
    const crossers = read.filter((x) => x.turns.length > 0);
    // A member nothing ever crosses answers with the ranking the end labels already print.
    if (!crossers.length) {
      dropped.push(guest.name);
      continue;
    }
    const longest = crossers.reduce((a, b) => (b.run.length > a.run.length ? b : a));
    const g = {
      name: guest.name,
      value: guest.to,
      rank: rows.indexOf(guest) + 1,
      count: rows.length,
      others: others.length,
      firstYear: first,
      lastYear: last,
      crossers: crossers.map((x) => x.host.name),
      always: read.filter((x) => x.turns.length === 0 && x.above[0]).map((x) => x.host.name),
      never: read.filter((x) => x.turns.length === 0 && !x.above[0]).map((x) => x.host.name),
      longest: { name: longest.host.name, length: longest.run.length, from: longest.run.from, to: longest.run.to },
    };
    const label = optionLabel(guest.name);
    const option = {
      key: guest.code,
      label,
      announce: plain(beat.announce(g)),
      note: plain(beat.note(g)),
      series: guest.series,
      verdicts: rows.map((host) => {
        const self = host.code === guest.code;
        const s = self ? { above: [], turns: [] } : standing(host, guest);
        const v = {
          host: host.name,
          guest: guest.name,
          self,
          turns: s.turns,
          aboveFirst: self ? false : s.above[0],
          aboveLast: self ? false : s.above[s.above.length - 1],
          years: years.length,
          firstYear: first,
          lastYear: last,
        };
        return { panel: host.code, text: plain(beat.verdict(v)) };
      }),
    };
    if (!option.announce.includes(label)) throw new Error(`announce() must contain the option's label (${label}); it says: ${option.announce}`);
    // The count must stand as its own number, not as a digit inside a year or a value.
    const count = g.crossers.length;
    if (!new RegExp(`(?<![\\d.,])${count}(?![\\d.,]\\d)`).test(option.note))
      throw new Error(`note() for ${guest.name} must state how many members cross it (${count}, from g.crossers.length); it says: ${option.note}`);
    for (const v of option.verdicts)
      if (!v.text.trim()) throw new Error(`verdict() returned nothing for ${v.panel} against ${guest.name}: every panel prints a verdict`);
    options.push(option);
  }
  if (!options.length) throw new Error(`no panel's curve ever crosses another's, so carrying one into the others shows nothing the end labels do not: this data needs no carry — draw it as a static small multiple`);
  if (dropped.length) console.log(`carry: ${dropped.join(", ")} not offered (no other member ever crosses it)`);
  const carry = { label: plain(beat.carryLabel), noneLabel: plain(beat.noneLabel), noneAnnounce: plain(beat.noneAnnounce), options };

  // The title may state a factor or a rank the panels compute (the worked example: "multiplied by 40").
  assertHeadlineNumbersDrawn(
    [beat.title].flat()[0],
    [...rows.flatMap((r) => values(r)), ...rows.map((r) => r.factor).filter((f) => f !== null)],
    "panels",
  );

  const title = plain([beat.title].flat()[0]);
  const caveat = plain([beat.limits].flat()[0]);
  const source = plain(beat.source);
  const reading = plain([beat.reading].flat()[0]);
  const eyebrow = plain(beat.eyebrow);
  const sharedNote = plain(beat.sharedNote);
  const alt = plain(beat.alt);

  const facts = beatFacts(rows.map((r) => ({ key: r.code, label: r.name, value: r.to })), { subject: thread[0] ?? rows[0].name, declaredSequence: sharedNote });
  applicableTreatments(facts);

  const controlText = [carry.label, carry.noneLabel, carry.noneAnnounce, ...carry.options.flatMap((o) => [o.label, o.announce, o.note])].join(" ");
  const verdictText = carry.options.flatMap((o) => o.verdicts.map((v) => v.text)).join(" ");
  const textPerRegister = {
    display: title,
    eyebrow,
    body: `${caveat} ${reading} ${source} ${controlText} ${panels.map((p) => p.detail).join(" ")}`,
    axis: `${panels.map((p) => `${p.name} ${p.endLabel}`).join(" ")} ${verdictText}`,
    annot: sharedNote,
    value: panels.map((p) => p.endLabel).join(" "),
  };

  await renderBeatWeb({
    here: HERE,
    textPerRegister,
    evidenceLevels: beat.evidenceLevels ?? 3,
    async render({ label, direction, outDir }) {
      return renderWeb({
        lang: beat.lang ?? storyLanguage(HERE) ?? "en",
        component: DirectedSmallMultiplesWeb,
        props: {
          panels,
          columns: beat.columns ?? (rows.length <= 4 ? 2 : 3),
          years,
          ceiling: beat.ceiling,
          carry,
          sharedNote,
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
    },
  });
});
