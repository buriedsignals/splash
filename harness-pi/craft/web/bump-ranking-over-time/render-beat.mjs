// The generic half of a bump WEB beat, taken from proof/web-bump-emitter-rank/render-directions-web.mjs
// with everything about ITS subject removed. The interaction is the worked example's and is not the
// model's to change: rank lines for the members that lead at the first or the last step (plus the
// subject), rank 1 at the top, the subject in the accent with every drawn member it passed captioned
// on its line; one mark per step answers hover/tap/Tab with the subject's rank, value and neighbours;
// and a "follow a line" control brings one other line forward, rings every step where it crossed
// somebody, and one sentence gives its rank run by run and every member it passed or was passed by —
// including members that have no line on the chart (CSS only, works without JS). This file computes
// the ranking over EVERY member, the walks and the crossings; ./beat.mjs — the one file the model
// writes — gives the data and WORDS every reading. Copied into the beat by the harness; never edited
// by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { readFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { DirectedBumpWeb } from "./DirectedBumpWeb.tsx";
import { applyStoryboard, assertNumbers, assertHeadlineNumbersDrawn } from "./guards.mjs";
import { chartWeb, plain, refusing, renderBeatWeb, storyLanguage } from "./web.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderWeb } = await import(chartWeb(HERE, "scripts", "render-web.mjs"));
  const { followRuns, followSlugOf, assertFollowChangesThePicture } = await import(chartWeb(HERE, "assets", "follow.ts"));

  const REQUIRED = ["eyebrow", "rows", "subject", "rankLabel", "detail", "passedLabel", "followLabel", "noneLabel", "optionLabel", "announce", "note", "crossingText", "title", "limits", "reading", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["rankLabel", "detail", "passedLabel", "optionLabel", "announce", "note", "crossingText", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  if (beat.display !== undefined && typeof beat.display !== "function") throw new Error(`beat.mjs: display must be a function (see CONTRACT.md)`);
  const display = (name) => plain(beat.display ? beat.display(name) : name);

  // ── the ranking: computed over EVERY member at every step ────────────────────────────────────
  assertNumbers(beat.rows.map((r) => [`${r.name} ${r.year}`, r.value]));
  assertNumbers(beat.rows.map((r) => [r.name, r.year]), "years");
  const seen = new Set();
  for (const r of beat.rows) {
    const id = `${r.name}\u0000${r.year}`;
    if (seen.has(id)) throw new Error(`rows holds two values for ${r.name} in ${r.year}: one row per member per year (leave out aggregates such as "World")`);
    seen.add(id);
  }
  const years = [...new Set(beat.rows.map((r) => r.year))].sort((a, b) => a - b);
  if (years.length < 3) throw new Error(`rows cover ${years.length} year(s): a bump follows a ranking over at least three steps`);
  const table = new Map(years.map((y) => [y, beat.rows.filter((r) => r.year === y).map((r) => ({ name: String(r.name), value: r.value })).sort((a, b) => b.value - a.value)]));
  const rankOf = (name, year) => table.get(year).findIndex((r) => r.name === name) + 1;
  const valueOf = (name, year) => table.get(year).find((r) => r.name === name)?.value ?? null;
  const first = years[0];
  const last = years[years.length - 1];

  const TOP = beat.topCount ?? 5;
  const MAX_RANK = beat.maxRank ?? 10;
  if (!(Number.isInteger(TOP) && TOP >= 2 && TOP <= 8)) throw new Error(`topCount is ${beat.topCount}: draw the top 2 to 8 at the first and last step`);
  if (!(Number.isInteger(MAX_RANK) && MAX_RANK > TOP && MAX_RANK <= 15)) throw new Error(`maxRank is ${beat.maxRank}: the frame draws more rank rows than topCount, at most 15`);
  if (rankOf(beat.subject, last) < 1) throw new Error(`subject ${JSON.stringify(beat.subject)} has no row in ${last}`);
  const topAt = (year) => table.get(year).slice(0, TOP).map((r) => r.name);
  const drawn = [...new Set([...topAt(first), ...topAt(last), String(beat.subject)])];
  for (const name of drawn)
    for (const y of years) {
      const r = rankOf(name, y);
      if (r < 1) throw new Error(`${name} has no row in ${y}: every drawn line needs a value at every step`);
      if (r > MAX_RANK) throw new Error(`${name} falls to rank ${r} in ${y}, past the ${MAX_RANK} rank rows this frame draws: raise maxRank (at most 15) or lower topCount`);
    }

  beat.check();

  // Keys in ids and selectors are the runner's own, never the model's names.
  const keyOf = new Map(drawn.map((name) => [name, null]));
  const lines = drawn
    .map((name) => ({ name, ranks: years.map((y) => rankOf(name, y)) }))
    .sort((a, b) => a.ranks[0] - b.ranks[0])
    .map((l, i) => {
      keyOf.set(l.name, `l${i + 1}`);
      return {
        code: `l${i + 1}`,
        name: display(l.name),
        ranks: l.ranks,
        startLabel: plain(beat.rankLabel({ name: display(l.name), rank: l.ranks[0], year: first })),
        endLabel: plain(beat.rankLabel({ name: display(l.name), rank: l.ranks[l.ranks.length - 1], year: last })),
      };
    });
  const subjectKey = keyOf.get(String(beat.subject));

  /** Who it passed and who passed it, step by step, over the WHOLE ranking. */
  function walkOf(name) {
    const positions = years.map((y) => rankOf(name, y));
    const crossings = [];
    for (let i = 1; i < years.length; i += 1) {
      const before = new Set(table.get(years[i - 1]).slice(0, positions[i - 1] - 1).map((r) => r.name));
      const after = new Set(table.get(years[i]).slice(0, positions[i] - 1).map((r) => r.name));
      for (const other of [...before].filter((c) => !after.has(c))) crossings.push({ year: years[i], rank: positions[i], name: other, direction: "passed" });
      for (const other of [...after].filter((c) => !before.has(c))) crossings.push({ year: years[i], rank: positions[i], name: other, direction: "overtaken" });
    }
    return { positions, crossings };
  }

  // ── the subject: its marks, and the drawn members it passed, captioned on its line ───────────
  const subjectWalk = walkOf(String(beat.subject));
  const stillDrawn = subjectWalk.crossings.filter((c) => c.direction === "passed" && drawn.includes(c.name));
  const crossings = stillDrawn.map((c) => ({ year: c.year, rank: c.rank, text: plain(beat.passedLabel({ name: display(c.name), year: c.year, rank: c.rank })) }));
  for (const c of crossings)
    if (!c.text.includes(String(c.year))) throw new Error(`passedLabel() is a caption on the subject's line, so it must say its year (${c.year}); it says: ${c.text}`);
  const marks = years.map((y) => {
    const rank = rankOf(String(beat.subject), y);
    const column = table.get(y);
    const above = column[rank - 2];
    const below = column[rank];
    const detail = plain(beat.detail({ name: display(String(beat.subject)), year: y, rank, value: valueOf(String(beat.subject), y), above: above ? display(above.name) : null, below: below ? display(below.name) : null }));
    if (!detail.includes(String(y))) throw new Error(`detail() answers for one year, so it must say that year (${y}); it says: ${detail}`);
    return { year: y, rank, detail };
  });

  // ── the follow: every line but the subject's ─────────────────────────────────────────────────
  const STEPS = years.map((y) => String(y));
  const followOptions = lines
    .filter((l) => l.code !== subjectKey)
    .map((l) => {
      const name = drawn.find((n) => keyOf.get(n) === l.code);
      const { positions, crossings: events } = walkOf(name);
      const runs = followRuns(STEPS, positions);
      const passed = events.filter((c) => c.direction === "passed").map((c) => ({ name: display(c.name), year: c.year }));
      const overtakenBy = events.filter((c) => c.direction === "overtaken").map((c) => ({ name: display(c.name), year: c.year }));
      const partners = [...new Set(events.map((c) => c.name))];
      const words = { name: display(name), first, last, runs, net: positions[0] - positions[positions.length - 1], passed, overtakenBy, undrawn: partners.filter((p) => !drawn.includes(p)).length };
      const option = {
        key: l.code,
        label: plain(beat.optionLabel({ name: display(name) })),
        announce: plain(beat.announce(words)),
        note: plain(beat.note(words)),
        positions,
        crossings: events.map((c) => ({ step: String(c.year), other: display(c.name), direction: c.direction, text: plain(beat.crossingText({ line: display(name), name: display(c.name), year: c.year, direction: c.direction })) })),
      };
      const unnamed = [...passed, ...overtakenBy].filter((p) => !option.note.includes(p.name));
      if (unnamed.length) throw new Error(`note() for ${display(name)} must name every member it passed or was passed by (from w.passed and w.overtakenBy); it leaves out ${[...new Set(unnamed.map((p) => p.name))].join(", ")}. It says: ${option.note}`);
      return option;
    });
  const follow = { label: plain(beat.followLabel), noneLabel: plain(typeof beat.noneLabel === "function" ? beat.noneLabel({ count: lines.length }) : beat.noneLabel), steps: STEPS, options: followOptions };

  // A title states the subject's ranks; they are drawn as the line's two end labels.
  assertHeadlineNumbersDrawn([beat.title].flat()[0], [...subjectWalk.positions, ...lines.flatMap((l) => l.ranks)], "ranks");

  const title = plain([beat.title].flat()[0]);
  const caveat = plain([beat.limits].flat()[0]);
  const source = plain(beat.source);
  const reading = plain(beat.reading);
  const eyebrow = plain(beat.eyebrow);
  const alt = plain(beat.alt);

  const facts = beatFacts(lines.map((l) => ({ key: l.code, label: l.name, value: MAX_RANK + 1 - l.ranks[l.ranks.length - 1] })), { subject: display(String(beat.subject)), declaredSequence: "rank" });
  applicableTreatments(facts);

  const textPerRegister = {
    display: title,
    eyebrow,
    body: `${caveat} ${reading} ${source} ${follow.label} ${follow.noneLabel} ${follow.options.map((o) => `${o.label} ${o.announce} ${o.note}`).join(" ")}`,
    axis: `${first} ${years[Math.floor(years.length / 2)]} ${last} ${lines.map((l) => l.startLabel).join(" ")}`,
    annot: crossings.map((c) => c.text).join(" "),
    value: lines.map((l) => l.endLabel).join(" "),
  };

  const undrawnNamed = new Set(followOptions.flatMap((o) => o.crossings.map((c) => c.other)).filter((n) => !lines.some((l) => l.name === n)));
  const interaction = {
    earns:
      `${MAX_RANK} rank rows are ${MAX_RANK} places in the ranking and this plate draws ${lines.length} lines on them, so a line that falls is a line ` +
      `falling past members it never names. Following one names every member it passed and every member that passed it, with the year — ` +
      `including the ${undrawnNamed.size} that have no line on this chart at all.`,
    controls: [
      {
        question: "Where did the subject stand that year, and what did it weigh?",
        gesture: "ask-a-mark",
        changes: "One mark per step answers with the subject's own rank that step, its value, and the two members immediately above and below it in the ranking.",
        parameter: "which step is asked about",
        authorPicked: String(last),
        readerPicks: "every mark",
        heldStill: [".chart-header", ".chart-source"],
      },
      {
        question: "Who is this other line, and who passed it?",
        gesture: "find-your-own-case",
        changes: "The chosen line comes forward in full ink with its two names, the rest of the field steps back, every step where it crossed somebody is ringed, and the sentence gives its rank run by run with every member it passed or was passed by, named and dated.",
        parameter: "which line is followed through the ranking",
        authorPicked: "none",
        readerPicks: ["none", ...followOptions.map((o) => followSlugOf(o.key))],
        heldStill: [".chart-header", ".chart-source"],
      },
    ],
  };

  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  await renderBeatWeb({
    here: HERE,
    textPerRegister,
    evidenceLevels: beat.evidenceLevels ?? 3,
    async render({ label, direction, outDir }) {
      const name = `${label}.html`;
      const result = await renderWeb({
        lang,
        component: DirectedBumpWeb,
        props: { lines, years, marks, follow, interaction, subject: subjectKey, maxRank: MAX_RANK, crossings, title, eyebrow, caveat, source, reading, alt, direction, ground: direction.ground, accent: direction.accent },
        outDir,
        name,
      });
      // Read the written page back: a follow whose options draw the same picture is refused here.
      assertFollowChangesThePicture(readFileSync(result.outPath, "utf8"), follow, `renders/${name}`);
      return result;
    },
  });
});
