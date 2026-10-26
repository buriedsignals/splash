// The generic half of a diverging-bar WEB beat, taken from
// proof/web-diverging-bar-eu-per-capita/render-directions-web.mjs with everything about ITS subject
// removed. The interaction is the worked example's and is not the model's to change: the ZERO is the
// thing the reader operates. A control ("measure each row from") moves the reference every bar is
// measured from — each row's own earlier level (the default: the change), the median of the earlier
// levels, the median of the later levels — while the rows (ordered by the later level) and the axis
// stay still; every bar re-aims, a sentence under the control says what that zero makes true, and
// every row answers hover/tap/Tab with its two levels and its distance from all three references.
// CSS only, works without JS. This file computes the references, the counts and every bar's value in
// every state; ./beat.mjs — the one file the model writes — gives the data and WORDS every reading.
// Copied into the beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { webRegisters } from "#shared/design-base/web.mjs";
import { DirectedDivergingBarWeb, rowFloorFor } from "./DirectedDivergingBarWeb.tsx";
import { applyStoryboard, assertNumbers, assertLegibleLabels, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { chartWeb, plain, refusing, renderBeatWeb, storyLanguage } from "./web.mjs";

/** Geometry units per CSS px at the narrowest verified width — the proof's measurement (720 / 195). */
const UNITS_PER_CSS_PX = 720 / 195;

const HERE = dirname(fileURLToPath(import.meta.url));
await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderWeb } = await import(chartWeb(HERE, "scripts", "render-web.mjs"));
  const { deriveFurniture, measureText } = await import(chartWeb(HERE, "scripts", "render-still.mjs"));
  const { labelBoxPx } = await import(chartWeb(HERE, "assets", "keyed-note.ts"));

  const REQUIRED = ["eyebrow", "rows", "subject", "subjectNote", "format", "datumLabel", "sideLabels", "references", "detail", "title", "limits", "reading", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["format", "detail", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  for (const ref of ["own", "fromMedian", "toMedian"]) {
    const w = beat.references[ref];
    if (!w || typeof w !== "object") throw new Error(`references.${ref} is missing: give { label, announce(o), note(o) } (see CONTRACT.md)`);
    for (const fn of ["announce", "note"]) if (typeof w[fn] !== "function") throw new Error(`references.${ref}.${fn} must be a function of the reading o (see CONTRACT.md)`);
    if (!String(w.label ?? "").trim()) throw new Error(`references.${ref}.label is empty`);
  }
  if (!beat.sideLabels?.left || !beat.sideLabels?.right) throw new Error(`sideLabels must be { left, right }: the words for "below the reference" and "above the reference"`);

  // ── the rows: every member, each with its two levels ───────────────────────────────────────────
  if (!Array.isArray(beat.rows) || beat.rows.length < 4 || beat.rows.length > 40)
    throw new Error(`rows holds ${beat.rows?.length ?? 0}: a diverging bar draws every row, which holds for 4 to 40`);
  assertNumbers(beat.rows.flatMap((r) => [[`${r.name} from`, r.from], [`${r.name} to`, r.to]]), "levels");
  const names = new Set(beat.rows.map((r) => String(r.name)));
  if (names.size !== beat.rows.length) throw new Error(`rows holds the same name twice: give each row ONE pair of levels (filter data.json to one series)`);
  if (!names.has(String(beat.subject))) throw new Error(`subject ${JSON.stringify(beat.subject)} is not a row's name; the names are ${[...names].join(", ")}`);

  beat.check();
  assertDrawsClaimColumn(beat.rows.flatMap((r) => [r.from, r.to]), HERE);

  // ── the three references and every row's value under each (the proof's arithmetic) ───────────
  const median = (xs) => {
    const s = [...xs].sort((a, b) => a - b);
    return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
  };
  const MED_FROM = median(beat.rows.map((r) => r.from));
  const MED_TO = median(beat.rows.map((r) => r.to));
  // THE ROW ORDER: the later level, descending — a property no choice of zero can change, so the
  // rows stay still while every bar re-aims.
  const rows = [...beat.rows]
    .sort((a, b) => b.to - a.to)
    .map((r, i) => ({
      key: `r${i + 1}`,
      name: String(r.name),
      from: r.from,
      to: r.to,
      change: r.to - r.from,
      vsFromMedian: r.to - MED_FROM,
      vsToMedian: r.to - MED_TO,
      rank: i + 1,
      isSubject: String(r.name) === String(beat.subject),
    }));
  if (!rows.some((r) => r.change > 0) || !rows.some((r) => r.change < 0))
    throw new Error(`every row's change is on the same side of zero; a diverging bar needs rows on both sides of their own earlier level`);
  const subject = rows.find((r) => r.isSubject);

  const STATES = [
    { field: "own", of: (r) => r.change, reference: null },
    { field: "fromMedian", of: (r) => r.vsFromMedian, reference: MED_FROM },
    { field: "toMedian", of: (r) => r.vsToMedian, reference: MED_TO },
  ];
  const readingOf = (state) => {
    const valued = rows.map((r) => ({ ...r, value: state.of(r) }));
    const below = valued.filter((r) => r.value < 0);
    const byValue = [...valued].sort((a, b) => b.value - a.value);
    return {
      reference: state.reference,
      count: rows.length,
      above: valued.filter((r) => r.value > 0),
      on: valued.filter((r) => r.value === 0),
      below,
      top: byValue[0],
      bottom: byValue.at(-1),
      meanBelow: below.length ? below.reduce((s, r) => s + r.value, 0) / below.length : null,
      spread: Math.max(...rows.map((r) => r.to)) - Math.min(...rows.map((r) => r.to)),
      subject: valued.find((r) => r.isSubject),
    };
  };
  const summary = Object.fromEntries(STATES.map((s) => [s.field, readingOf(s)]));

  assertLegibleLabels(rows.map((r) => r.change), beat.format);
  assertHeadlineNumbersDrawn(
    [beat.title].flat()[0],
    [...rows.flatMap((r) => [r.from, r.to, r.change]), ...STATES.flatMap((s) => [summary[s.field].above.length, summary[s.field].below.length])],
    "rows",
  );

  // THE NOTE ON THE SUBJECT HANGS INTO THE ROWS BELOW IT (the component's own promise): every one of
  // them must be drawn left of the rule under all three references.
  for (const s of STATES)
    for (const r of rows.slice(subject.rank)) {
      if (s.of(r) < 0) continue;
      throw new Error(
        `${r.name} sits below the subject in the row order (rows run from the largest later level down) but is not below zero under the ` +
          `"${beat.references[s.field].label}" reference — the note beside ${subject.name} hangs into the rows under it on the promise that ` +
          `all of them are drawn left of the rule in every state. This page cannot carry this subject; it fits a subject whose later level is among the lowest`,
      );
    }

  // ── the words ────────────────────────────────────────────────────────────────────────────────
  const valuesFor = (s) => rows.map((r) => ({ key: r.key, value: s.of(r), label: plain(beat.format(s.of(r))) }));
  const words = Object.fromEntries(
    STATES.map((s) => {
      const w = beat.references[s.field];
      const label = plain(w.label);
      const announce = plain(w.announce(summary[s.field]));
      if (!announce.includes(label))
        throw new Error(`references.${s.field}.announce() must contain references.${s.field}.label ("${label}") word for word — a screen reader hears it for that pill; it says: ${announce}`);
      return [s.field, { label, announce, note: plain(w.note(summary[s.field])) }];
    }),
  );
  const span = Math.ceil(Math.max(...STATES.flatMap((s) => rows.map((r) => Math.abs(s.of(r))))));
  const xTicks = [-span, -span / 2, 0, span / 2, span].map((t) => Math.round(t * 10) / 10);
  const datum = {
    label: plain(beat.datumLabel),
    noneLabel: words.own.label,
    noneAnnounce: words.own.announce,
    noneNote: words.own.note,
    span,
    base: valuesFor(STATES[0]),
    options: STATES.slice(1).map((s) => ({ key: s.field === "fromMedian" ? "from-median" : "to-median", ...words[s.field], values: valuesFor(s) })),
  };

  const shaped = rows.map((r) => ({ code: r.key, name: r.name, detail: plain(beat.detail(r)) }));
  const repeated = shaped.find((r, i) => shaped.findIndex((x) => x.detail === r.detail) !== i);
  if (repeated) throw new Error(`detail() answers two rows with the same sentence (${JSON.stringify(repeated.detail)}): start it with the row's name`);

  const title = plain([beat.title].flat()[0]);
  const caveat = plain([beat.limits].flat()[0]);
  const source = plain(beat.source);
  const reading = plain([beat.reading].flat()[0]);
  const eyebrow = plain(beat.eyebrow);
  const subjectNote = plain(beat.subjectNote);
  const sideLabels = { left: plain(beat.sideLabels.left), right: plain(beat.sideLabels.right) };
  const alt = plain(typeof beat.alt === "function" ? beat.alt(summary) : beat.alt);

  const facts = beatFacts(rows.map((r) => ({ key: r.key, label: r.name, value: r.change })), { subject: subject.name, declaredSequence: eyebrow });
  applicableTreatments(facts);

  const controlText = [datum.label, datum.noneLabel, datum.noneAnnounce, datum.noneNote, ...datum.options.flatMap((o) => [o.label, o.announce, o.note])].join(" ");
  const textPerRegister = {
    display: title,
    eyebrow,
    body: `${caveat} ${reading} ${source} ${controlText} ${shaped.map((r) => r.detail).join(" ")}`,
    axis: `${xTicks.join(" ")} + − ${rows.map((r) => r.name).join(" ")}`,
    annot: subjectNote,
    value: [datum.base, ...datum.options.map((o) => o.values)].flat().map((v) => v.label).join(" "),
  };

  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  await renderBeatWeb({
    here: HERE,
    textPerRegister,
    evidenceLevels: beat.evidenceLevels ?? 2,
    async render({ label, direction, outDir }) {
      // THE ROW FLOOR AND THE GUTTER, DERIVED FROM THIS DIRECTION'S OWN REGISTERS — the component
      // re-derives the floor and refuses a declaration that differs.
      const furniture = deriveFurniture(direction.ground);
      const regs = webRegisters(direction, { ink: { ink: furniture.ink, muted: furniture.muted, accent: direction.accent } });
      const rowFloor = rowFloorFor(regs, measureText, shaped.length);
      // The widest name, plus the shared .axis-label right offset (10 px) and the proof's 9 px of
      // slack; never under the proof's own 96.
      const widestName = Math.max(...rows.map((r) => labelBoxPx(r.name, { ...regs.axis, fontWeight: r.isSubject ? 700 : regs.axis.fontWeight }, measureText, { chip: false }).w));
      const gutterPx = Math.max(96, Math.ceil(widestName + 19));
      const { outPath } = await renderWeb({
        lang,
        component: DirectedDivergingBarWeb,
        props: {
          rows: shaped,
          subject: subject.key,
          xTicks,
          span,
          datum,
          unitsPerCssPx: UNITS_PER_CSS_PX,
          rowFloor,
          gutterPx,
          title, eyebrow, caveat, source, reading, subjectNote, sideLabels, alt,
          direction,
          fitPointerStep: true,
          ground: direction.ground,
          accent: direction.accent,
        },
        // Legibility before fitting the window: every row carries a name and a chipped figure, so
        // the phone page may scroll for this declared reason and no other.
        rowFloor,
        outDir,
        name: `${label}.html`,
      });
      return { outPath };
    },
  });
});
