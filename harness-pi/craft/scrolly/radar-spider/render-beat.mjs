// The generic half of a radar (spider) SCROLLY beat, taken from
// proof/scrolly-radar-electricity-mix/render-directions-scrolly.mjs with everything about ITS subject
// removed. The choreography is the worked example's and is not the model's to change — six cards,
// one continuous interpolation driven by the reader's scroll (radar-drive.mjs, verbatim):
//
//   1 totals   the two items' totals as bars; the wheel waits;
//   2 subject  the subject's polygon traced spoke by spoke, clockwise from twelve o'clock;
//   3 other    the other item's polygon over it;
//   4 families every spoke travels to its family's angle, its share to the family's sum;
//   5 scale    the ceiling tightened to `tightCeiling`; a share past it rests on the ring, marked open;
//   6 reading  the two polygons on the full ceiling; the card states the accounting (the limits).
//
// This file computes every figure the cards may state (the totals, the shares, the family sums, the
// ceilings) and checks the words against them; ./beat.mjs — the one file the model writes — gives the
// data and the WORDS of each card. Copied into the beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { webRegisters } from "#shared/design-base/web.mjs";
import { EYEBROW_TO_DISPLAY, gapOf, registerOf } from "#shared/design-base/register.mjs";
import { DirectedRadarScrolly } from "./DirectedRadarScrolly.tsx";
import { applyStoryboard, assertNumbers, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { plain, refusing, storyLanguage } from "./web.mjs";
import { renderBeatScrolly, scrollySkill } from "./scrolly.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The cards, in the drive's order: the runner's own ids (never the model's words in an id). */
const CARDS = ["totals", "subject", "other", "families", "scale", "reading"];
/** One state per card; see radar-drive.mjs for what each field paints. `N` is the number of spokes;
 *  everything else is the worked example's, verbatim. */
const STATE_TABLE = (N) => [
  { bars: 1, trace0: 0, trace1: 0, merge: 0, scale: 0, note: 0 },
  { bars: 0, trace0: N, trace1: 0, merge: 0, scale: 0, note: 1 },
  { bars: 0, trace0: N, trace1: N, merge: 0, scale: 0, note: 2 },
  { bars: 0, trace0: N, trace1: N, merge: 1, scale: 0, note: 3 },
  { bars: 0, trace0: N, trace1: N, merge: 0, scale: 1, note: 4 },
  { bars: 0, trace0: N, trace1: N, merge: 0, scale: 0, note: 5 },
];
/** The component's header-note slots, one per card, in the same order. */
const NOTE_SLOTS = ["totalNote", "subjectNote", "otherNote", "familyNote", "scaleNote", "legendNote"];

await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderScrolly } = await import(scrollySkill(HERE, "scripts", "render-scrolly.mjs"));

  const REQUIRED = ["eyebrow", "items", "subject", "totals", "spokes", "families", "tightCeiling", "format", "formatTotal", "formatCeiling", "cards", "notes", "title", "limits", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")} (see CONTRACT.md)`);
  for (const fn of ["format", "formatTotal", "formatCeiling", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  for (const group of ["cards", "notes"]) {
    const keys = group === "cards" ? CARDS.slice(0, 5) : CARDS;
    const absent = keys.filter((k) => typeof beat[group]?.[k] !== "function");
    if (absent.length) throw new Error(`beat.mjs: ${group} must give a function for each of ${keys.join(", ")}; missing or not a function: ${absent.join(", ")} (see CONTRACT.md)`);
  }

  // ── the two items, their totals and their shares ───────────────────────────────────────────────
  if (!Array.isArray(beat.items) || beat.items.length !== 2) throw new Error(`items must name the TWO items the radar compares, e.g. ["Item A", "Item B"]; it is ${JSON.stringify(beat.items)}`);
  if (beat.subject !== beat.items[0])
    throw new Error(`subject is ${JSON.stringify(beat.subject)}, but this choreography traces items[0] first, in the accent: put the subject first in items (and first in every spoke's shares and in totals)`);
  if (!Array.isArray(beat.totals) || beat.totals.length !== 2) throw new Error(`totals must give each item's total (the whole its shares are of), in the order of items`);
  assertNumbers(beat.totals.map((v, k) => [beat.items[k], v]), "totals");
  if (beat.totals.some((v) => !(v > 0))) throw new Error(`a total is zero or negative: card 1 draws each item's total as a bar`);
  if (!Array.isArray(beat.families) || beat.families.length < 2 || beat.families.length > 4)
    throw new Error(`families must name 2 to 4 groups of spokes, in order (["renewables", "nuclear", "fossil"]); card 4 gathers the spokes into them`);
  if (!Array.isArray(beat.spokes) || beat.spokes.length < 5 || beat.spokes.length > 12)
    throw new Error(`spokes holds ${beat.spokes?.length ?? 0} spokes; this radar draws 5 to 12`);
  const spokeKeys = beat.spokes.map((s) => String(s.key));
  if (new Set(spokeKeys).size !== spokeKeys.length) throw new Error(`two spokes share a key (${spokeKeys.join(", ")})`);
  for (const s of beat.spokes) {
    if (!Array.isArray(s.shares) || s.shares.length !== 2) throw new Error(`spoke ${s.key}: shares must give one % per item, in the order of items`);
    assertNumbers(s.shares.map((v, k) => [`${s.key}.${beat.items[k]}`, v]), "spokes");
    if (s.shares.some((v) => v < 0 || v > 100)) throw new Error(`spoke ${s.key} holds a share outside 0–100: shares are percent of the item's own total`);
    if (!(Number.isInteger(s.family) && s.family >= 0 && s.family < beat.families.length))
      throw new Error(`spoke ${s.key}: family must be the index of its group in families (0 to ${beat.families.length - 1}); it is ${s.family}`);
  }
  // Spokes of one family must be adjacent: card 4 turns them together to their family's angle.
  const runs = beat.spokes.map((s) => s.family).filter((f, i, a) => i === 0 || f !== a[i - 1]);
  if (new Set(runs).size !== runs.length) throw new Error(`the spokes of one family are not adjacent (family order clockwise: ${runs.join(", ")}): order spokes so each family's spokes sit side by side`);
  if (beat.families.some((_, f) => !beat.spokes.some((s) => s.family === f))) throw new Error(`a family has no spoke: every name in families must hold at least one spoke`);
  for (const k of [0, 1]) {
    const sum = beat.spokes.reduce((a, s) => a + s.shares[k], 0);
    if (Math.abs(sum - 100) > 0.5)
      throw new Error(`${beat.items[k]}'s shares add up to ${sum.toFixed(2)} %, not 100: every spoke is a share of the item's own total — compute value / (sum of that item's spoke values) × 100 over every spoke`);
  }

  const familyShares = beat.families.map((_, f) => [0, 1].map((k) => beat.spokes.reduce((a, s) => a + (s.family === f ? s.shares[k] : 0), 0)));
  const ceiling = Math.ceil(Math.max(...beat.spokes.flatMap((s) => s.shares)) / 10) * 10;
  const tight = beat.tightCeiling;
  if (!(typeof tight === "number" && tight > 0 && tight < ceiling))
    throw new Error(`tightCeiling is ${tight}: card 5 tightens the ring from ${ceiling} % to a smaller ceiling, so it must be a number between 0 and ${ceiling}`);
  const overTight = beat.spokes.flatMap((s) => s.shares.map((v, k) => ({ key: String(s.key), label: s.label, item: beat.items[k], share: v })).filter((x) => x.share > tight));
  if (!overTight.length) throw new Error(`no share passes tightCeiling (${tight} %): card 5 lets a spike go past the tightened ring; lower tightCeiling below the largest share`);
  const inside = beat.spokes.flatMap((s) => s.shares).filter((v) => v <= tight);
  if (inside.length < beat.spokes.length) throw new Error(`only ${inside.length} shares fit inside tightCeiling (${tight} %): card 5 opens the small shares, so most must fit; raise tightCeiling`);
  const topOf = (k) => {
    const s = [...beat.spokes].sort((a, b) => b.shares[k] - a.shares[k])[0];
    return { key: String(s.key), label: s.label, share: s.shares[k] };
  };
  const longestFamily = (k) => familyShares.map((f, i) => [f[k], i]).sort((a, b) => b[0] - a[0])[0][1];
  const shares = Object.fromEntries(beat.spokes.map((s) => [String(s.key), [...s.shares]]));
  const reading = {
    items: [...beat.items],
    totals: [...beat.totals],
    ratio: Math.max(...beat.totals) / Math.min(...beat.totals),
    spokeCount: beat.spokes.length,
    spokes: beat.spokes.map((s) => ({ key: String(s.key), label: s.label, family: s.family, shares: [...s.shares] })),
    shares,
    families: beat.families.map((label, f) => ({ label, shares: familyShares[f], longestFor: [0, 1].filter((k) => longestFamily(k) === f) })),
    subjectTop: topOf(0),
    otherTop: topOf(1),
    ceiling,
    tight,
    overTight,
  };
  Object.freeze(reading);
  beat.check(reading);
  assertDrawsClaimColumn(beat.spokes.flatMap((s) => s.shares), HERE);

  // ── the words, each passed through plain(); every number they state is checked ───────────────────
  const say = (field, value) => {
    const text = typeof value === "function" ? value(reading) : value;
    const parts = [text].flat();
    if (!parts.length || parts.some((p) => typeof p !== "string" || !p.trim())) throw new Error(`${field} must return a non-empty sentence (or an array of paragraphs); it returned ${JSON.stringify(text)}`);
    return parts.map(plain);
  };
  const format = (v) => plain(beat.format(v));
  const prose = [...CARDS.slice(0, 5).map((k) => say(`cards.${k}`, beat.cards[k])), say("limits", [beat.limits].flat()[0])];
  const notes = Object.fromEntries(CARDS.map((k, i) => [NOTE_SLOTS[i], say(`notes.${k}`, beat.notes[k]).join(" ")]));
  const cardText = (i) => prose[i].join(" ");

  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  const printed = String(beat.format(1.5));
  const decimal = /\d,\d/.test(printed) ? "," : /\d\.\d/.test(printed) ? "." : (1.5).toLocaleString(lang).includes(",") ? "," : ".";
  const group = decimal === "," ? "[ .]" : "[ ,]";
  const dec = decimal === "." ? "\\." : ",";
  const figure = new RegExp(`(?<![\\p{L}\\d.,])(\\d{1,3}(?:${group}\\d{3})+(?:${dec}\\d+)?|\\d+(?:${dec}\\d+)?)(?![\\p{L}\\d])`, "gu");
  const figuresOf = (text) =>
    [...plain(text).matchAll(figure)].map((m) => {
      const raw = m[1];
      const [whole, frac = ""] = raw.split(decimal);
      return { raw, n: Number(`${whole.replace(/[ .,]/g, "")}.${frac || "0"}`), frac };
    });
  const within = (f, v) => Math.abs(v - f.n) <= 0.5 * 10 ** -f.frac.length + 1e-9;

  // What each card is ABOUT, so it must say it: the figures its picture shows.
  const owes = (i, what, v) => {
    if (!figuresOf(cardText(i)).some((f) => within(f, v))) throw new Error(`card ${i + 1} (cards.${CARDS[i]}) must state ${what} = ${Number.isInteger(v) ? String(v) : format(v)} — the figure its picture shows; it says: ${cardText(i)}`);
  };
  owes(0, "r.totals[0]", beat.totals[0]);
  owes(0, "r.totals[1]", beat.totals[1]);
  owes(1, "r.subjectTop.share", reading.subjectTop.share);
  owes(2, "r.otherTop.share", reading.otherTop.share);
  const otherLongest = longestFamily(1);
  owes(3, `families[${otherLongest}]'s share for ${beat.items[0]}`, familyShares[otherLongest][0]);
  owes(3, `families[${otherLongest}]'s share for ${beat.items[1]}`, familyShares[otherLongest][1]);
  owes(4, "r.tight", tight);

  // Every other figure a card, a note or the alt text states must be one this kit computed, at the
  // precision it is written with: a share, a sum of spokes of one family, a family's share, a total,
  // a ceiling. A year (1900–2100) and a figure glued to letters pass.
  const pairSums = [0, 1].flatMap((k) =>
    beat.spokes.flatMap((a, i) => beat.spokes.slice(i + 1).filter((b) => b.family === a.family).map((b) => a.shares[k] + b.shares[k])),
  );
  const known = [
    ...beat.totals, reading.ratio, ceiling, tight, beat.spokes.length, beat.families.length, 100,
    ...beat.spokes.flatMap((s) => s.shares), ...familyShares.flat(), ...pairSums,
  ];
  const checkFigures = (where, text) => {
    for (const f of figuresOf(text)) {
      if (!f.frac && Number.isInteger(f.n) && f.n >= 1900 && f.n <= 2100) continue;
      if (!known.some((v) => within(f, v)))
        throw new Error(`${where} states ${f.raw}, which no figure of this radar rounds to: every number in a card is computed — use the reading (r.totals, r.shares[key][k], r.families[f].shares[k], r.tight, …) through format(), never a typed or recomputed value. It says: ${text}`);
    }
  };
  CARDS.slice(0, 5).forEach((k, i) => checkFigures(`card ${i + 1} (cards.${k})`, cardText(i)));
  CARDS.forEach((k, i) => checkFigures(`notes.${k}`, notes[NOTE_SLOTS[i]]));

  const titleForms = [beat.title].flat().map(plain);
  assertHeadlineNumbersDrawn(titleForms[0], [...beat.spokes.flatMap((s) => s.shares), ...familyShares.flat(), ...beat.totals], "spokes");

  const eyebrow = plain(beat.eyebrow);
  const source = plain(beat.source);
  const alt = plain(typeof beat.alt === "function" ? beat.alt(reading) : beat.alt);
  checkFigures("alt", alt);
  const items = beat.items.map(plain);
  const spokes = beat.spokes.map((s) => ({ key: String(s.key), label: plain(s.label), family: s.family, shares: [...s.shares], texts: s.shares.map(format) }));
  const families = beat.families.map((label, f) => {
    const name = plain(label);
    return { label: name[0].toUpperCase() + name.slice(1), shares: familyShares[f], texts: familyShares[f].map(format) };
  });
  const totals = beat.totals.map((v) => ({ value: v, text: plain(beat.formatTotal(v)) }));
  const ceilings = [ceiling, tight].map((v) => ({ value: v, text: plain(beat.formatCeiling(v)) }));
  const words = notes;

  const textPerRegister = {
    display: titleForms.join(" "),
    eyebrow,
    body: `${prose.flat().join(" ")} ${source}`,
    axis: ceilings.map((c) => c.text).join(" "),
    annot: `${spokes.map((s) => s.label).join(" ")} ${families.map((f) => f.label).join(" ")} ${items.join(" ")}`,
    value: `${spokes.map((s) => s.texts.join(" · ")).join(" ")} ${families.map((f) => f.texts.join(" · ")).join(" ")} ${totals.map((t) => t.text).join(" ")} ${Object.values(words).join(" ")}`,
  };

  const STATES = STATE_TABLE(spokes.length);
  const driver = readFileSync(join(HERE, "radar-drive.mjs"), "utf8");
  await renderBeatScrolly({
    here: HERE,
    states: STATES,
    textPerRegister,
    evidenceLevels: beat.evidenceLevels ?? 3,
    async render({ label, direction, outDir }) {
      const { ink, muted, grid } = deriveFurniture(direction.ground);
      const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
      const { outPath } = await renderScrolly({
        steps: prose.map((p, i) => ({ id: CARDS[i], prose: p })),
        reveal: {
          element: createElement(DirectedRadarScrolly, { spokes, families, items, totals, ceilings, words, alt, regs, stroke: direction.stroke ?? {}, ground: direction.ground, accent: direction.accent, ink, muted, grid }),
          states: STATES,
          driver,
          apply: "applyRadarState",
        },
        title: titleForms,
        eyebrow,
        source,
        ground: direction.ground,
        type: { eyebrow: { ...regs.eyebrow, marginBottom: `${gapOf(registerOf(direction, "eyebrow"), EYEBROW_TO_DISPLAY)}px` }, display: regs.display, body: regs.body, source: regs.body },
        lang,
        outDir,
        name: `${label}.html`,
      });
      return { outPath };
    },
  });
});
