// The generic half of a dot-strip WEB beat, taken from
// proof/web-dot-strip-lowcarbon-spread/render-directions-web.mjs with everything about ITS subject
// removed. The interaction is the worked example's and is not the model's to change: every unit is a
// dot on two ruled rails (two states) sharing one 0–100 scale, each rail headed by its floor, middle,
// ceiling and spread; a LADDER lets the reader choose what the axis counts — each rung takes a part
// away from the numerator over the SAME whole, so a dot can only move left — and the dots slide to
// the positions their new values put them at. Every dot answers hover/tap/Tab. CSS only, works
// without JS. This file computes every share, the rails' statistics, the ranks and the falls;
// ./beat.mjs — the one file the model writes — gives the data and WORDS every reading. Copied into
// the beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { readFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { DirectedDotStripWeb, FRAME, rowFloorFor } from "./DirectedDotStripWeb.tsx";
import { applyStoryboard, assertNumbers, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { chartWeb, plain, refusing, renderBeatWeb, storyLanguage } from "./web.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderWeb } = await import(chartWeb(HERE, "scripts", "render-web.mjs"));
  const { deriveFurniture, measureText } = await import(chartWeb(HERE, "scripts", "render-still.mjs"));
  const { assertOneQualifying, qualifySlugOf } = await import(chartWeb(HERE, "assets", "qualify.ts"));

  const REQUIRED = ["eyebrow", "units", "from", "to", "whole", "rungs", "subject", "ladderLabel", "stats", "detail", "title", "limits", "reading", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["whole", "stats", "detail", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);

  // ── the units, the two states, the ladder ─────────────────────────────────────────────────────
  if (!Array.isArray(beat.units) || beat.units.length < 4 || beat.units.length > 40)
    throw new Error(`units holds ${beat.units?.length ?? 0}: a dot strip draws 4 to 40 units on each rail`);
  const units = beat.units.map((u, i) => ({ key: `u${i + 1}`, name: String(typeof u === "string" ? u : u.name), code: String(typeof u === "string" ? u : u.code ?? u.name) }));
  if (new Set(units.map((u) => u.name)).size !== units.length) throw new Error(`units holds the same name twice: one unit per name`);
  const STATES = [String(beat.from), String(beat.to)];
  if (STATES[0] === STATES[1]) throw new Error(`from and to are both ${JSON.stringify(beat.from)}: a dot strip compares two different states`);
  const subject = units.find((u) => u.name === String(beat.subject));
  if (!subject) throw new Error(`subject ${JSON.stringify(beat.subject)} is not a unit's name`);
  const lit = new Set([subject.name, ...[beat.alsoLit ?? []].flat().map(String)]);
  for (const n of lit) if (!units.some((u) => u.name === n)) throw new Error(`alsoLit names ${JSON.stringify(n)}, which is not a unit`);
  if (lit.size > 3) throw new Error(`alsoLit lights ${lit.size - 1} more units: the accent marks the subject and at most two other cases`);
  if (!Array.isArray(beat.rungs) || beat.rungs.length < 2 || beat.rungs.length > 5)
    throw new Error(`rungs holds ${beat.rungs?.length ?? 0}: the ladder needs 2 to 5 rungs, the first being the takeaway's own measure`);
  beat.rungs.forEach((r, i) => {
    if (!String(r.label ?? "").trim()) throw new Error(`rungs[${i}].label is empty`);
    for (const fn of ["part", "announce"]) if (typeof r[fn] !== "function") throw new Error(`rungs[${i}].${fn} must be a function (see CONTRACT.md)`);
    if (i === 0 && r.note !== undefined) throw new Error(`rungs[0] is the default picture (the claim the title states) and carries no note: remove rungs[0].note`);
    if (i > 0 && typeof r.note !== "function") throw new Error(`rungs[${i}].note must be a function of the rung's reading o: the sentence saying what this rung shows`);
  });

  // Every share: the rung's part over the SAME whole, in percent.
  const wholes = new Map();
  for (const u of units) for (const s of STATES) wholes.set(`${u.name}|${s}`, beat.whole(u.name, s));
  assertNumbers([...wholes].map(([k, v]) => [k, v]), "whole()");
  const zero = [...wholes].find(([, v]) => !(v > 0));
  if (zero) throw new Error(`whole() is ${zero[1]} for ${zero[0].replace("|", " at ")}: a share over nothing is no position — leave that unit out`);
  const shares = beat.rungs.map((r) => {
    const m = new Map();
    for (const u of units) for (const s of STATES) m.set(`${u.name}|${s}`, (r.part(u.name, s) / wholes.get(`${u.name}|${s}`)) * 100);
    return m;
  });
  shares.forEach((m, i) => assertNumbers([...m].map(([k, v]) => [`rungs[${i}] ${k}`, v]), "shares"));
  shares.forEach((m, i) => {
    const off = [...m].find(([, v]) => v < 0 || v > 100.0001);
    if (off) throw new Error(`rungs[${i}].part() over whole() gives ${off[1].toFixed(2)} % for ${off[0].replace("|", " at ")}: a part must lie between 0 and its whole`);
    if (i > 0) {
      const up = [...m].find(([k, v]) => v > shares[i - 1].get(k) + 1e-9);
      if (up) throw new Error(`rungs[${i}] puts ${up[0].replace("|", " at ")} at ${up[1].toFixed(2)} %, ABOVE rungs[${i - 1}] (${shares[i - 1].get(up[0]).toFixed(2)} %): each rung takes a part AWAY from the one before it, so a dot can only move left`);
    }
  });

  beat.check();
  assertDrawsClaimColumn([...shares[0].values()], HERE);

  // ── each rung, measured: the two rails' floor, middle, ceiling and spread ─────────────────────
  const median = (xs) => { const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  const rungs = beat.rungs.map((r, i) => {
    const lanes = STATES.map((state) => {
      const values = units.map((u) => ({ name: u.name, key: u.key, value: shares[i].get(`${u.name}|${state}`) })).sort((a, b) => a.value - b.value);
      return { state, values, floor: values[0], ceiling: values.at(-1), median: median(values.map((v) => v.value)), span: values.at(-1).value - values[0].value };
    });
    const falls = units
      .map((u) => ({ name: u.name, fall: shares[0].get(`${u.name}|${STATES[1]}`) - shares[i].get(`${u.name}|${STATES[1]}`) }))
      .sort((a, b) => b.fall - a.fall);
    // Letter keys, never digits: a qualify slug ending in a digit ("rung-1") fails verify-web's
    // "choosing it again restores the landing picture" (measured: the same page with "rung-a" passes).
    return { index: i, key: `rung-${"abcde"[i]}`, label: plain(r.label), stripped: r.stripped === undefined ? null : plain(r.stripped), lanes, falls, rung: r };
  });
  const readingOf = (rung) => ({
    label: rung.label,
    stripped: rung.stripped,
    from: rung.lanes[0],
    to: rung.lanes[1],
    falls: rung.falls,
    value: (name, state) => shares[rung.index].get(`${name}|${String(state)}`),
    base: rungs[0].lanes,
  });

  assertHeadlineNumbersDrawn(
    [beat.title].flat()[0],
    [...shares[0].values(), ...rungs.flatMap((r) => r.lanes.flatMap((l) => [l.floor.value, l.ceiling.value, l.median, l.span])), rungs[0].lanes[1].floor.value - rungs[0].lanes[0].floor.value, rungs[0].lanes[1].ceiling.value - rungs[0].lanes[0].ceiling.value, rungs[0].lanes[0].span - rungs[0].lanes[1].span],
    "dots",
  );

  // THE JITTER: a hash of the unit's code, never random — identical on both rails and in every rung.
  const jitterOf = (code) => {
    let h = 2166136261;
    for (const ch of code) {
      h ^= ch.charCodeAt(0);
      h = Math.imul(h, 16777619);
    }
    return Number(((((h >>> 0) % 2001) / 1000 - 1) * FRAME.jitter).toFixed(3));
  };
  const across = new Map(units.map((u) => [u.key, jitterOf(u.code)]));

  // ── the declaration and the drawing, from one pass ────────────────────────────────────────────
  const qualify = {
    label: plain(beat.ladderLabel),
    axisMax: 100,
    options: rungs.map((rung, i) => {
      const reading = readingOf(rung);
      const announce = plain(rung.rung.announce(reading));
      if (!announce.includes(rung.label)) throw new Error(`rungs[${i}].announce() must contain rungs[${i}].label ("${rung.label}") word for word — a screen reader hears it for that pill; it says: ${announce}`);
      return {
        key: rung.key,
        label: rung.label,
        announce,
        ...(i > 0 ? { note: plain(rung.rung.note(reading)) } : {}),
        seats: rung.lanes.flatMap((lane) => lane.values.map((v) => ({ lane: lane.state, key: v.key, value: v.value, across: across.get(v.key), denominator: wholes.get(`${v.name}|${lane.state}`) }))),
        spans: rung.lanes.map((lane) => ({ lane: lane.state, floor: lane.floor.value, ceiling: lane.ceiling.value })),
      };
    }),
  };

  const rankIn = (lane, name) => lane.values.findIndex((v) => v.name === name) + 1;
  const rails = rungs.map((rung) => ({
    slug: qualifySlugOf(rung.key),
    lanes: rung.lanes.map((lane, l) => {
      const other = rung.lanes[1 - l];
      return {
        key: lane.state,
        ticks: [lane.floor.value, lane.median, lane.ceiling.value],
        marks: lane.values.map((v) => {
          const base = shares[0].get(`${v.name}|${lane.state}`);
          const m = {
            name: v.name,
            state: lane.state,
            value: v.value,
            otherState: other.state,
            otherValue: other.values.find((z) => z.name === v.name).value,
            rank: rankIn(lane, v.name),
            otherRank: rankIn(other, v.name),
            count: units.length,
            baseValue: base,
            lessThanBase: base - v.value,
            rungIndex: rung.index,
            rungLabel: rung.label,
            stripped: rung.stripped,
            isSubject: v.name === subject.name,
          };
          return { key: v.key, name: v.name, value: v.value, across: across.get(v.key), lit: lit.has(v.name), detail: plain(beat.detail(m)) };
        }),
      };
    }),
  }));
  for (const rail of rails)
    for (const lane of rail.lanes) {
      const same = lane.marks.find((m, i) => lane.marks.findIndex((x) => x.detail === m.detail) !== i);
      if (same) throw new Error(`detail() answers two dots of one rail with the same sentence (${JSON.stringify(same.detail)}): start it with the unit's name`);
    }

  const stats = rungs.flatMap((rung) =>
    rung.lanes.map((lane) => ({
      lane: lane.state,
      slug: qualifySlugOf(rung.key),
      text: plain(beat.stats({ state: lane.state, floor: lane.floor, ceiling: lane.ceiling, median: lane.median, span: lane.span, rungLabel: rung.label })),
    })),
  );
  const laneHeadings = Object.fromEntries(STATES.map((s) => [s, plain(s)]));

  const title = plain([beat.title].flat()[0]);
  const caveat = plain([beat.limits].flat()[0]);
  const source = plain(beat.source);
  const reading = plain([beat.reading].flat()[0]);
  const eyebrow = plain(beat.eyebrow);
  const alt = plain(typeof beat.alt === "function" ? beat.alt(rungs.map(readingOf)) : beat.alt);
  const xTicks = [0, 25, 50, 75, 100];
  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  const tickUnit = /^fr\b/.test(lang) ? " %" : "%";

  const facts = beatFacts(rungs[0].lanes[1].values.map((v) => ({ key: v.key, label: v.name, value: v.value })), { subject: subject.name, declaredSequence: "%" });
  applicableTreatments(facts);

  const textPerRegister = {
    display: title,
    eyebrow,
    body: `${caveat} ${reading} ${source}`,
    axis: `${xTicks.join(" ")}${tickUnit}`,
    annot:
      `${STATES.join(" ")} ${stats.map((s) => s.text).join(" ")} ` +
      `${qualify.label} ${qualify.options.map((o) => `${o.label} ${o.announce} ${o.note ?? ""}`).join(" ")} ` +
      `${rails.flatMap((r) => r.lanes.flatMap((l) => l.marks.map((m) => m.detail))).join(" ")} ${alt}`,
    value: rails[0].lanes.flatMap((l) => l.marks.map((m) => String(Math.round(m.value * 10) / 10))).join(" "),
  };

  await renderBeatWeb({
    here: HERE,
    textPerRegister,
    evidenceLevels: beat.evidenceLevels ?? 3,
    async render({ label, direction, outDir }) {
      // THE ROW FLOOR, derived from this direction's own annot register and the real strings by the
      // component's own arithmetic — the component refuses one it did not derive.
      const furniture = deriveFurniture(direction.ground);
      const { floor: rowFloor } = rowFloorFor({
        direction,
        ink: { ink: furniture.ink, muted: furniture.muted, accent: direction.accent },
        measure: measureText,
        stats,
        lanes: STATES,
        laneHeadings,
      });
      const { outPath } = await renderWeb({
        lang,
        component: DirectedDotStripWeb,
        props: {
          rails, qualify, lanes: STATES, laneHeadings, stats, xTicks,
          title, eyebrow, caveat, source, reading, alt,
          direction,
          rowFloor,
          ground: direction.ground,
          accent: direction.accent,
          tickUnit,
        },
        outDir,
        name: `${label}.html`,
        // A dot strip's lanes are its rows, each headed by its state and its statistics row: the one
        // reason this page may scroll.
        rowFloor,
      });
      // The refusals only the WRITTEN page can carry (a half-tagged datum, a vocabulary that emitted
      // no rules, a blanket hide that landed after the default rail's own reveal).
      assertOneQualifying(readFileSync(outPath, "utf8"), qualify, label);
      return { outPath };
    },
  });
});
