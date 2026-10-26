// The generic half of a pie-and-donut SCROLLY beat, taken from
// proof/scrolly-donut-world-co2-share/render-directions-scrolly.mjs with everything about ITS subject
// removed. The choreography is the worked example's and is not the model's to change — six cards,
// one continuous interpolation driven by the reader's scroll (donut-drive.mjs, verbatim):
//
//   1 whole    the first state: one ring for the whole, an arc per drawn part;
//   2 pair     the two parts the takeaway names kept, the others stepping back;
//   3 turn     the arcs turn to the second state's shares;
//   4 grow     the ring's area follows the whole's growth, the first state's ring left as an outline;
//   5 trap     the one part whose share fell while its amount rose, alone, its first-state arc beside it;
//   6 split    the ring breaks into one ring per part; the card states the accounting (the limits).
//
// This file computes every figure the cards may state (the shares, the whole's growth, the part the
// growth hides) and checks the words against them; ./beat.mjs — the one file the model writes — gives
// the data and the WORDS of each card. Copied into the beat by the harness; never edited by the model.
//
// The drive is the worked example's, byte for byte, and it writes some words itself: every share as
// "32,9 %" (decimal comma), every amount as "12,2 Gt", and the trap's label as "1,5 puis 1,7 Gt". So
// this kit draws French stories whose amounts are in gigatonnes, and refuses any other.
//
// Usage:  bun <beat>/render-beat.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { webRegisters } from "#shared/design-base/web.mjs";
import { EYEBROW_TO_DISPLAY, gapOf, registerOf } from "#shared/design-base/register.mjs";
import { DirectedDonutScrolly } from "./DirectedDonutScrolly.tsx";
import { applyStoryboard, assertNumbers, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { plain, refusing, storyLanguage } from "./web.mjs";
import { renderBeatScrolly, scrollySkill } from "./scrolly.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The cards, in the drive's order: the runner's own ids (never the model's words in an id). */
const CARDS = ["whole", "pair", "turn", "grow", "trap", "split"];
/** One state per card; see donut-drive.mjs for what each field paints. The worked example's, verbatim. */
const STATES = [
  { year: 0, pair: 0, grow: 0, russia: 0, split: 0 },
  { year: 0, pair: 1, grow: 0, russia: 0, split: 0 },
  { year: 1, pair: 1, grow: 0, russia: 0, split: 0 },
  { year: 1, pair: 0, grow: 1, russia: 0, split: 0 },
  { year: 1, pair: 0, grow: 1, russia: 1, split: 0 },
  { year: 1, pair: 0, grow: 1, russia: 0, split: 1 },
];

await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderScrolly } = await import(scrollySkill(HERE, "scripts", "render-scrolly.mjs"));

  const REQUIRED = ["eyebrow", "rings", "wholeBefore", "wholeAfter", "subject", "counterpart", "from", "to", "amountUnit", "unit", "cards", "notes", "title", "limits", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  if (typeof beat.check !== "function") throw new Error(`beat.mjs: check must be a function (see CONTRACT.md)`);
  const groups = { cards: CARDS.slice(0, 5), notes: ["grow", "trap", "split"] };
  for (const [group, keys] of Object.entries(groups)) {
    const absent = keys.filter((k) => typeof beat[group]?.[k] !== "function");
    if (absent.length) throw new Error(`beat.mjs: ${group} must give a function for each of ${keys.join(", ")}; missing or not a function: ${absent.join(", ")} (see CONTRACT.md)`);
  }

  // What the drive writes by itself (see the header): French, gigatonnes.
  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  if (!/^fr\b/i.test(lang))
    throw new Error(`the story's language is ${lang}, but this scrolly's drive writes French by itself (the decimal comma, "puis" in the trap's label): this kit draws French stories only — choose another treatment for this story`);
  if (beat.amountUnit !== "Gt")
    throw new Error(`amountUnit is ${JSON.stringify(beat.amountUnit)}, but this scrolly's drive prints every amount followed by "Gt": give the amounts in gigatonnes (billions of tonnes) and set amountUnit: "Gt", or choose another treatment for this story`);

  // ── the rings: the drawn parts of one whole, at two states ──────────────────────────────────────
  if (!Array.isArray(beat.rings) || beat.rings.length < 3 || beat.rings.length > 8)
    throw new Error(`rings holds ${beat.rings?.length ?? 0} parts; this scrolly shares one ring between 3 and 8 parts`);
  assertNumbers(beat.rings.flatMap((r) => [[`${r.key}.before`, r.before], [`${r.key}.after`, r.after]]), "rings");
  assertNumbers([["wholeBefore", beat.wholeBefore], ["wholeAfter", beat.wholeAfter]], "the whole");
  const keys = beat.rings.map((r) => String(r.key));
  if (new Set(keys).size !== keys.length) throw new Error(`two rings share a key: one ring per part`);
  if (beat.rings.some((r) => r.before < 0 || r.after < 0)) throw new Error(`a ring holds a negative value: a share of a whole starts at zero`);
  const sum = (k) => beat.rings.reduce((s, r) => s + r[k], 0);
  if (!(beat.wholeBefore > 0) || sum("before") > beat.wholeBefore * 1.001)
    throw new Error(`wholeBefore is ${beat.wholeBefore}, but the rings add up to ${sum("before")} at the first state: the whole is the total of EVERY part (every row of the partition), computed, not only the rings drawn`);
  if (!(beat.wholeAfter > 0) || sum("after") > beat.wholeAfter * 1.001)
    throw new Error(`wholeAfter is ${beat.wholeAfter}, but the rings add up to ${sum("after")} at the second state: the whole is the total of EVERY part, computed, not only the rings drawn`);
  if (!(beat.wholeAfter > beat.wholeBefore))
    throw new Error(`the whole shrank (${beat.wholeBefore} → ${beat.wholeAfter}): card 4 grows the ring with the whole and card 5 shows a part whose share fell while its amount rose. This choreography needs a whole that grew`);

  const rings = beat.rings.map((r) => ({
    key: String(r.key),
    name: r.name,
    before: r.before,
    after: r.after,
    shareBefore: (r.before / beat.wholeBefore) * 100,
    shareAfter: (r.after / beat.wholeAfter) * 100,
  }));
  const find = (k, field) => {
    const ring = rings.find((r) => r.key === String(k));
    if (!ring) throw new Error(`${field} is ${JSON.stringify(k)}, which is not a key of rings (${keys.join(", ")})`);
    return ring;
  };
  const subject = find(beat.subject, "subject");
  const counterpart = find(beat.counterpart, "counterpart");
  if (subject === counterpart) throw new Error(`subject and counterpart are the same ring: card 2 keeps TWO parts, the takeaway's subject and the other part it names`);
  const candidates = rings.filter((r) => r.shareAfter < r.shareBefore && r.after > r.before);
  let trap;
  if (beat.trap !== undefined) {
    trap = find(beat.trap, "trap");
    if (!candidates.includes(trap))
      throw new Error(`trap is ${trap.name}, but its share went ${trap.shareBefore.toFixed(1)} → ${trap.shareAfter.toFixed(1)} % while its amount went ${trap.before} → ${trap.after}: card 5 shows a part whose share FELL while its amount ROSE. Candidates: ${candidates.map((r) => r.name).join(", ") || "none"}`);
  } else if (candidates.length === 1) trap = candidates[0];
  else
    throw new Error(candidates.length
      ? `${candidates.length} rings have a share that fell while their amount rose (${candidates.map((r) => r.key).join(", ")}): name the one card 5 is about in trap`
      : `no ring has a share that fell while its amount rose: card 5 is about such a part, which this data does not hold. Choose another treatment for this story`);
  if (trap === subject || trap === counterpart) throw new Error(`trap is ${trap.name}, one of the pair card 2 keeps: card 5 shows a third part, the one the whole's growth hides`);

  const growth = (beat.wholeAfter / beat.wholeBefore - 1) * 100;
  const ringOf = (r) => ({ key: r.key, name: r.name, before: r.before, after: r.after, shareBefore: r.shareBefore, shareAfter: r.shareAfter });
  const reading = {
    from: String(beat.from),
    to: String(beat.to),
    count: rings.length,
    wholeBefore: beat.wholeBefore,
    wholeAfter: beat.wholeAfter,
    growth,
    rings: rings.map(ringOf),
    subject: ringOf(subject),
    counterpart: ringOf(counterpart),
    trap: ringOf(trap),
  };
  Object.freeze(reading);
  beat.check(reading);
  assertDrawsClaimColumn(rings.flatMap((r) => [r.before, r.after]), HERE);

  // ── the words, each passed through plain(); every number they state is checked ───────────────────
  const say = (field, value) => {
    const text = typeof value === "function" ? value(reading) : value;
    const parts = [text].flat();
    if (!parts.length || parts.some((p) => typeof p !== "string" || !p.trim())) throw new Error(`${field} must return a non-empty sentence (or an array of paragraphs); it returned ${JSON.stringify(text)}`);
    return parts.map(plain);
  };
  const prose = [...CARDS.slice(0, 5).map((k) => say(`cards.${k}`, beat.cards[k])), say("limits", [beat.limits].flat()[0])];
  const cardText = (i) => prose[i].join(" ");

  const figure = /(?<![\p{L}\d.,])(\d{1,3}(?:[ .]\d{3})+(?:,\d+)?|\d+(?:,\d+)?)(?![\p{L}\d])/gu;
  const figuresOf = (text) =>
    [...plain(text).matchAll(figure)].map((m) => {
      const raw = m[1];
      const [whole, frac = ""] = raw.split(",");
      return { raw, n: Number(`${whole.replace(/[ .]/g, "")}.${frac || "0"}`), frac };
    });
  const within = (f, v) => Math.abs(v - f.n) <= 0.5 * 10 ** -f.frac.length + 1e-9;

  // What each card is ABOUT, so it must say it: the figures its picture shows.
  const owes = (i, what, v) => {
    if (!figuresOf(cardText(i)).some((f) => within(f, v))) throw new Error(`card ${i + 1} (cards.${CARDS[i]}) must state ${what} (${v.toFixed(2)}) — the figure its picture shows; it says: ${cardText(i)}`);
  };
  owes(0, "r.wholeBefore", beat.wholeBefore);
  owes(1, "r.subject.shareBefore", subject.shareBefore);
  owes(1, "r.counterpart.shareBefore", counterpart.shareBefore);
  owes(2, "r.subject.shareAfter", subject.shareAfter);
  owes(2, "r.counterpart.shareAfter", counterpart.shareAfter);
  owes(3, "r.wholeAfter", beat.wholeAfter);
  owes(3, "r.growth", growth);
  owes(4, "r.trap.shareBefore", trap.shareBefore);
  owes(4, "r.trap.shareAfter", trap.shareAfter);
  owes(4, "r.trap.before", trap.before);
  owes(4, "r.trap.after", trap.after);

  // Every other figure a card, a note or the alt text states must be one this kit computed, at the
  // precision it is written with. A year (1900–2100) and a figure glued to letters (CO2) pass.
  const known = [rings.length, beat.wholeBefore, beat.wholeAfter, growth, ...rings.flatMap((r) => [r.before, r.after, r.shareBefore, r.shareAfter]), 100];
  const checkFigures = (where, text) => {
    for (const f of figuresOf(text)) {
      if (!f.frac && Number.isInteger(f.n) && f.n >= 1900 && f.n <= 2100) continue;
      if (!known.some((v) => within(f, v)))
        throw new Error(`${where} states ${f.raw}, which no figure of this plate rounds to: every number in a card is computed — use the reading (r.wholeBefore, r.growth, r.subject.shareAfter, r.trap.before, …) at one decimal, never a typed or recomputed value. It says: ${text}`);
    }
  };
  CARDS.slice(0, 5).forEach((k, i) => checkFigures(`card ${i + 1} (cards.${k})`, cardText(i)));

  const unit = plain(beat.unit);
  if (!unit.includes("{year}")) throw new Error(`unit must hold the placeholder {year}, which the page replaces with the state the ring shows ("share of world CO₂ in {year}, one full turn = 100 %"); it is: ${unit}`);
  const words = {
    unit,
    worldNote: say("notes.grow", beat.notes.grow).join(" "),
    trapNote: say("notes.trap", beat.notes.trap).join(" "),
    splitNote: say("notes.split", beat.notes.split).join(" "),
  };
  for (const [k, v] of Object.entries(words)) checkFigures(`notes (${k})`, v.replace("{year}", ""));

  const titleForms = [beat.title].flat().map(plain);
  // The title states shares, which the rings draw (their amounts too).
  assertHeadlineNumbersDrawn(titleForms[0], rings.flatMap((r) => [r.shareBefore, r.shareAfter, r.before, r.after]), "rings");

  const eyebrow = plain(beat.eyebrow);
  const source = plain(beat.source);
  const alt = plain(typeof beat.alt === "function" ? beat.alt(reading) : beat.alt);
  checkFigures("alt", alt);
  // Codes are the runner's own (p1…pN): the drive compares them, and a quote in a key would break the markup.
  const codeOf = new Map(rings.map((r, i) => [r.key, `p${i + 1}`]));
  const countries = rings.map((r) => ({
    code: codeOf.get(r.key),
    name: plain(r.name),
    shareBefore: r.shareBefore,
    shareAfter: r.shareAfter,
    gtBefore: r.before,
    gtAfter: r.after,
  }));
  const years = [plain(reading.from), plain(reading.to)];

  const textPerRegister = {
    display: titleForms.join(" "),
    eyebrow,
    body: `${prose.flat().join(" ")} ${source}`,
    axis: `${words.unit} ${words.splitNote} ${years.join(" ")} Gt 0123456789,·`,
    annot: countries.map((c) => c.name).join(" "),
    value: `${words.worldNote} ${words.trapNote} 0123456789,%·Gt`,
  };

  const driver = readFileSync(join(HERE, "donut-drive.mjs"), "utf8");
  await renderBeatScrolly({
    here: HERE,
    states: STATES,
    textPerRegister,
    evidenceLevels: beat.evidenceLevels ?? 4,
    async render({ label, direction, outDir }) {
      const { ink, muted } = deriveFurniture(direction.ground);
      const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
      const { outPath } = await renderScrolly({
        steps: prose.map((p, i) => ({ id: CARDS[i], prose: p })),
        reveal: {
          element: createElement(DirectedDonutScrolly, {
            countries,
            subject: codeOf.get(subject.key),
            pair: [codeOf.get(subject.key), codeOf.get(counterpart.key)],
            trap: codeOf.get(trap.key),
            years,
            worldBefore: beat.wholeBefore,
            worldAfter: beat.wholeAfter,
            words,
            alt,
            regs,
            ground: direction.ground,
            accent: direction.accent,
            ink,
            muted,
          }),
          states: STATES,
          driver,
          apply: "applyDonutState",
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
