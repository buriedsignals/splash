// The generic half of a pictogram (isotype) WEB beat, taken from
// proof/web-pictogram-europe-lowcarbon/render-directions-web.mjs with everything about ITS subject
// removed. The interaction is the worked example's and is not the model's to change: a "one square
// is worth" control re-counts the field — one square one thing (the default, the static plate), or
// one square per `perValue` of a quantity — and the ink runs into the grid or drains out of it while
// no square moves; every square answers hover/tap/Tab, under the default with its own thing, under a
// quantity with the things that fill it and the fraction each one puts in. This file computes every
// block, every square and its attribution; ./beat.mjs — the one file the model writes — gives the
// things, the blocks, the quantities and the WORDS. Copied into the beat by the harness; never edited
// by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { readFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { skillScriptFrom } from "#shared/design-base/skill-script.mjs";
import { DirectedPictogramWeb, GRID, fieldGeometry } from "./DirectedPictogramWeb.tsx";
import { applyStoryboard, assertNumbers, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { chartWeb, plain, refusing, renderBeatWeb, storyLanguage } from "./web.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderWeb } = await import(chartWeb(HERE, "scripts", "render-web.mjs"));
  const { assertOneUnit, unitCellId } = await import(skillScriptFrom(HERE, "chart-web", "assets", "unit.ts"));

  const REQUIRED = ["eyebrow", "units", "blocks", "controlLabel", "countLabel", "countAnnounce", "measures", "figure", "detailThing", "detailSquare", "title", "limits", "reading", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["figure", "detailThing", "detailSquare", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);

  // ── the things: one square each under the default unit ────────────────────────────────────────
  assertNumbers(beat.units.map((u) => [u.key, u.value]), "unit values");
  if (beat.units.length < 10 || beat.units.length > 200)
    throw new Error(`units holds ${beat.units.length} things; a countable field is 10 to 200 squares. With fewer, draw a bar; with more, a square is no longer one thing a reader can count — choose a histogram`);
  const keys = beat.units.map((u) => String(u.key));
  if (new Set(keys).size !== keys.length) throw new Error(`two units share a key: one square per thing — filter data.json to one row per thing (one year)`);
  const absent = [beat.absent ?? []].flat();
  if (absent.length) {
    const note = String(beat.absentNote ?? "");
    if (!note.includes(String(absent.length)) && !absent.every((a) => note.includes(String(a))))
      throw new Error(`${absent.length} thing(s) have no reading and are not drawn; absentNote must say so — with that count or every one's name — it says: "${note}"`);
  }

  // ── the blocks: 2 or 3, top to bottom, the FIRST in the accent ─────────────────────────────────
  if (!Array.isArray(beat.blocks) || beat.blocks.length < 2 || beat.blocks.length > 3)
    throw new Error(`blocks holds ${beat.blocks?.length} groups; the page draws 2 or 3 (its tones are the accent, a tint of it, and a neutral)`);
  const TONE_KEYS = beat.blocks.length === 3 ? ["high", "mid", "low"] : ["high", "low"];
  const lo = (b) => b.min ?? -Infinity;
  const hi = (b) => b.max ?? Infinity;
  const homes = beat.units.map((u) => ({ u, in: beat.blocks.filter((b) => u.value >= lo(b) && u.value < hi(b)) }));
  const homeless = homes.filter((h) => h.in.length === 0);
  if (homeless.length)
    throw new Error(`${homeless.length} unit(s) fall in no block (${homeless.slice(0, 3).map((h) => `${h.u.label}=${h.u.value}`).join(", ")}): the blocks' min/max ranges must cover every value (a block takes min <= value < max)`);
  const doubled = homes.find((h) => h.in.length > 1);
  if (doubled) throw new Error(`${doubled.u.label} (${doubled.u.value}) falls in ${doubled.in.length} blocks: block ranges must not overlap (min <= value < max)`);
  for (const b of beat.blocks)
    if (plain(b.name).length > 14)
      throw new Error(`block name "${b.name}" is ${plain(b.name).length} characters; it sits in a 104 px gutter beside its field — keep it to 14 (a range: "75 % et plus", "under 60 %")`);

  const all = [...beat.units].sort((a, b) => b.value - a.value || (String(a.key) < String(b.key) ? -1 : 1));
  const BLOCKS = beat.blocks.map((b, i) => ({ key: TONE_KEYS[i], ownKey: b.key ?? String(i), name: plain(b.name), test: (u) => u.value >= lo(b) && u.value < hi(b) }));
  const membersOf = new Map(BLOCKS.map((b) => [b.key, all.filter(b.test)]));
  for (const b of BLOCKS) if (!membersOf.get(b.key).length) throw new Error(`block "${b.name}" holds no unit: every block must hold at least one (change its min/max)`);
  const rankOf = new Map(all.map((u, i) => [u.key, i + 1]));
  const blockNameOf = new Map(all.map((u) => [u.key, BLOCKS.find((b) => b.test(u)).name]));

  // ── the units of the control: the default (one square, one thing) and 1 to 3 quantities ────────
  if (!Array.isArray(beat.measures) || beat.measures.length < 1 || beat.measures.length > 3)
    throw new Error(`measures holds ${beat.measures?.length} quantities; the control offers the count plus 1 to 3 quantities`);
  beat.measures.forEach((m, i) => {
    for (const f of ["label", "announce", "perValue", "amount", "note"])
      if (m[f] === undefined) throw new Error(`measures[${i}] is missing ${f} (see CONTRACT.md)`);
    for (const f of ["amount", "note"]) if (typeof m[f] !== "function") throw new Error(`measures[${i}].${f} must be a function (see CONTRACT.md)`);
    assertNumbers(all.map((u) => [u.key, m.amount(u)]), `measures[${i}].amount values`);
    const negative = all.find((u) => m.amount(u) < 0);
    if (negative) throw new Error(`measures[${i}].amount gives ${negative.label} ${m.amount(negative)}: a square counts a quantity, it cannot be negative`);
  });
  const UNITS = [
    { key: "count", label: plain(beat.countLabel), perValue: 1, quantity: () => 1, announce: plain(beat.countAnnounce) },
    ...beat.measures.map((m, i) => ({ key: `m${i + 1}`, own: m, label: plain(m.label), perValue: m.perValue, quantity: (u) => m.amount(u), announce: plain(m.announce) })),
  ];

  const sumOf = (unit, members) => members.reduce((s, u) => s + unit.quantity(u), 0);
  const iconsIn = (unit, blockKey) => sumOf(unit, membersOf.get(blockKey)) / unit.perValue;
  for (const unit of UNITS.slice(1)) {
    const squares = BLOCKS.reduce((s, b) => s + iconsIn(unit, b.key), 0);
    if (squares > 200) throw new Error(`"${unit.label}" draws ${squares.toFixed(1)} squares; past 200 a reader stops counting — raise its perValue (1, 2, 5 × a power of ten)`);
    if (squares < 5) throw new Error(`"${unit.label}" draws only ${squares.toFixed(2)} squares; lower its perValue (1, 2, 5 × a power of ten) so the field has something to count`);
  }

  /** One reading of a unit, handed to note(), alt() and check(): what every block resolves to. */
  const measureReading = (unit) => {
    const sum = sumOf(unit, all);
    return {
      key: unit.key,
      label: unit.label,
      perValue: unit.perValue,
      sum,
      squares: sum / unit.perValue,
      blocks: BLOCKS.map((b) => {
        const members = membersOf.get(b.key);
        const amount = sumOf(unit, members);
        const largest = members.reduce((a, c) => (unit.quantity(c) > unit.quantity(a) ? c : a));
        return {
          key: b.ownKey,
          name: b.name,
          count: members.length,
          countShare: (members.length / all.length) * 100,
          amount,
          share: sum > 0 ? (amount / sum) * 100 : 0,
          squares: amount / unit.perValue,
          largest: { label: largest.label, amount: unit.quantity(largest), squares: unit.quantity(largest) / unit.perValue },
        };
      }),
    };
  };
  const readingsByUnit = new Map(UNITS.map((u) => [u.key, measureReading(u)]));
  const measures = UNITS.slice(1).map((u) => readingsByUnit.get(u.key));

  const counts = Object.fromEntries(BLOCKS.map((b) => [b.ownKey, membersOf.get(b.key).length]));
  const total = all.length;
  const checkArgs = { blocks: readingsByUnit.get("count").blocks, counts, total, measures };
  beat.check(checkArgs);
  assertDrawsClaimColumn(all.map((u) => u.value), HERE);
  assertHeadlineNumbersDrawn([beat.title].flat()[0], [...Object.values(counts), total, absent.length], "block counts");

  // THE GESTURE'S OWN CLAIM: counting things and counting a quantity must disagree, or the control is
  // a re-skin of the default field.
  const disagreement = Math.max(...measures.flatMap((m) => m.blocks.map((b) => Math.abs(b.share - b.countShare))));
  if (!(disagreement > 5))
    throw new Error(`no quantity moves any block's share of the field by more than ${disagreement.toFixed(1)} points against the count: the control would re-count the field and show the same picture — choose quantities on which the blocks differ (or draw a static pictogram)`);

  /** THE GRID'S CAPACITY IS A FACT ABOUT THE WIDEST OPTION, never about the data. */
  const blocks = BLOCKS.map((b) => ({ key: b.key, capacity: Math.max(...UNITS.map((u) => Math.ceil(iconsIn(u, b.key) - 1e-9))) }));

  /** The worked example's walk: a block's things laid end to end, cut into squares of perValue. */
  function attribute(unit, blockKey) {
    const members = membersOf.get(blockKey);
    const sum = sumOf(unit, members);
    const icons = sum / unit.perValue;
    const out = [];
    const cells = Math.ceil(icons - 1e-9);
    let cursor = 0;
    let index = 0;
    for (let cell = 0; cell < cells; cell += 1) {
      const from = cell * unit.perValue;
      const to = Math.min((cell + 1) * unit.perValue, sum);
      const parts = [];
      let walk = cursor;
      let i = index;
      while (i < members.length && walk < to) {
        const q = unit.quantity(members[i]);
        const overlap = Math.min(walk + q, to) - Math.max(walk, from);
        if (overlap > 1e-9) parts.push({ unit: members[i], overlap });
        walk += q;
        i += 1;
      }
      while (index < members.length && cursor + unit.quantity(members[index]) <= to + 1e-9) {
        cursor += unit.quantity(members[index]);
        index += 1;
      }
      out.push({ cell, from, to, fill: (to - from) / unit.perValue, parts });
    }
    return { icons, cells: out };
  }

  const fields = new Map();
  for (const unit of UNITS) for (const block of blocks) fields.set(`${unit.key}:${block.key}`, attribute(unit, block.key));

  // ── the readings every square answers with, worded by beat.mjs ───────────────────────────────
  const amountsOf = (u) => Object.fromEntries(beat.measures.map((m, i) => [m.key ?? `m${i + 1}`, m.amount(u)]));
  function detailFor(unit, blockKey, cell) {
    const field = fields.get(`${unit.key}:${blockKey}`);
    const block = BLOCKS.find((b) => b.key === blockKey);
    if (unit.key === "count") {
      const u = cell.parts[0].unit;
      return beat.detailThing({ key: u.key, label: u.label, value: u.value, rank: rankOf.get(u.key), of: all.length, block: block.name, amounts: amountsOf(u), unit: u });
    }
    const amount = cell.to - cell.from;
    return beat.detailSquare({
      measure: { key: unit.own.key ?? unit.key, label: unit.label, perValue: unit.perValue },
      block: block.name,
      index: cell.cell + 1,
      squares: field.icons,
      whole: cell.fill > 0.999,
      fillPct: cell.fill * 100,
      amount,
      parts: cell.parts.map((p) => ({ label: p.unit.label, amount: p.overlap, pct: (p.overlap / amount) * 100 })),
      solo: cell.parts.length === 1 ? { label: cell.parts[0].unit.label, squares: unit.quantity(cell.parts[0].unit) / unit.perValue } : null,
    });
  }

  const geometry = fieldGeometry(blocks);
  const plates = UNITS.map((unit) => ({
    slug: unit.key,
    cells: blocks.flatMap((block) => {
      const field = fields.get(`${unit.key}:${block.key}`);
      return field.cells.map((cell) => {
        const seat = geometry.seatOf(block.key, cell.cell);
        const detail = plain(detailFor(unit, block.key, cell));
        return { id: unitCellId(block.key, cell.cell), block: block.key, x: seat.x, y: seat.y, width: cell.fill * GRID.ink, detail, announce: detail };
      });
    }),
  }));
  for (const plate of plates) {
    const seen = new Map();
    for (const c of plate.cells) {
      if (seen.has(c.detail)) throw new Error(`under "${UNITS.find((u) => u.key === plate.slug).label}" two squares answer the same words ("${c.detail}"): ${plate.slug === "count" ? "detailThing" : "detailSquare"}() must say what differs (start with the thing's name, or the square's index)`);
      seen.set(c.detail, true);
    }
  }

  // ── the declaration ───────────────────────────────────────────────────────────────────────────
  const figures = (u) => blocks.map((b) => ({ block: b.key, text: plain(beat.figure(iconsIn(u, b.key), u.key === "count")) }));
  for (const u of UNITS)
    for (const f of figures(u))
      if (f.text.length > 13) throw new Error(`figure() prints "${f.text}" (${f.text.length} characters) beside a block; it sits in a 104 px gutter — keep it to 13 ("16 squares", "28.98 sq.")`);
  for (const b of blocks)
    for (let i = 1; i < UNITS.length; i += 1) {
      const [n0, n1] = [iconsIn(UNITS[0], b.key), iconsIn(UNITS[i], b.key)];
      const [t0, t1] = [beat.figure(n0, true), beat.figure(n1, false)].map(plain);
      if (Math.abs(n0 - n1) >= 0.1 && t0 === t1)
        throw new Error(`figure() prints "${t0}" for ${n0} squares and for ${n1.toFixed(2)} squares: it must print the number it is given (with one decimal for a part square)`);
    }
  const unit = {
    label: plain(beat.controlLabel),
    blocks,
    cell: GRID.cell,
    ink: GRID.ink,
    sliver: 2.8,
    ceiling: blocks.reduce((s, b) => s + b.capacity, 0),
    options: UNITS.map((u) => ({
      key: u.key,
      label: u.label,
      per: u.label,
      perValue: u.perValue,
      announce: u.announce,
      ...(u.key === "count" ? {} : { note: plain(u.own.note(readingsByUnit.get(u.key))) }),
      counts: blocks.map((b) => ({ block: b.key, icons: iconsIn(u, b.key) })),
      figures: figures(u),
    })),
  };
  for (const o of unit.options)
    if (!o.announce.includes(o.label)) throw new Error(`the announce of "${o.label}" must contain that label word for word (a screen reader speaks it); it says: ${o.announce}`);

  const absentNote = absent.length ? plain(beat.absentNote) : "";
  const title = plain([beat.title].flat()[0]);
  const caveat = plain([beat.limits].flat()[0]);
  const source = plain(absentNote ? `${beat.source} · ${absentNote}` : beat.source);
  const reading = plain(typeof beat.reading === "function" ? beat.reading(checkArgs) : beat.reading);
  const eyebrow = plain(beat.eyebrow);
  const alt = plain(typeof beat.alt === "function" ? beat.alt(checkArgs) : beat.alt);
  const blockNames = BLOCKS.map((b) => ({ key: b.key, name: b.name }));
  const format = beat.format ?? ((v) => String(v));

  const subject = membersOf.get(BLOCKS[0].key)[0];
  const interaction = {
    earns:
      `A still must choose what one square is worth and ask to be trusted; here the reader holds the unit among ${UNITS.length} options and re-counts ` +
      `a field of ${total} squares whose seats never move, and every square answers with what fills it — which no fixed plate can say, since it has one unit.`,
    controls: [
      {
        question: "What is one square worth?",
        gesture: "toggle-a-comparison",
        changes: "The ink runs into the field or drains out of it: each block keeps its seats and changes length, its last square fills to its own remainder, and each block's figure is replaced in place in the gutter.",
        parameter: "what one square is worth",
        authorPicked: "count",
        readerPicks: UNITS.map((u) => u.key),
        heldStill: [".chart-header", ".chart-source"],
      },
      {
        question: "Who is this square?",
        gesture: "ask-a-mark",
        changes: "The square itself steps off its own fill and answers, under the count, with its thing; under a quantity, with the things that fill it and the fraction each puts in.",
        parameter: "which square is asked about",
        authorPicked: plain(subject.label),
        readerPicks: "every mark",
        heldStill: [".chart-header", ".chart-source"],
      },
    ],
  };

  const facts = beatFacts(all.map((u) => ({ key: String(u.key), label: u.label, value: u.value })), {
    subject: subject.label,
    declaredSequence: plain(beat.unitThing ?? beat.countLabel),
    units: { count: total, thing: plain(beat.countLabel) },
    interaction: { controls: interaction.controls.length, readerParameter: true },
  });
  applicableTreatments(facts);

  const textPerRegister = {
    display: title,
    eyebrow,
    body: `${caveat} ${reading} ${source}`,
    axis: blockNames.map((b) => b.name).join(" "),
    annot: `${unit.label} ` + unit.options.map((o) => `${o.label} ${o.announce} ${o.note ?? ""} ${o.figures.map((f) => f.text).join(" ")}`).join(" "),
    value: all.map((u) => plain(format(u.value))).join(" "),
  };

  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  await renderBeatWeb({
    here: HERE,
    textPerRegister,
    evidenceLevels: beat.evidenceLevels ?? 3,
    async render({ label, direction, outDir }) {
      const out = await renderWeb({
        lang,
        component: DirectedPictogramWeb,
        props: { plates, unit, blockNames, interaction, title, eyebrow, caveat, source, alt, reading, direction, ground: direction.ground, accent: direction.accent, deepenWhenNoTint: true },
        outDir,
        name: `${label}.html`,
      });
      // The worked example reads the written page back: a cell at a seat no rule sets, a blanket
      // emitted after the rules it should outrank, an answering layer left visible.
      assertOneUnit(readFileSync(out.outPath, "utf8"), unit, `${label}.html`);
      return out;
    },
  });
});
