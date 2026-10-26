// The generic half of a lollipop SCROLLY beat, taken from
// proof/scrolly-lollipop-co2-per-person/render-directions-scrolly.mjs with everything about ITS
// subject removed. The choreography is the worked example's and is not the model's to change — six
// cards, one continuous interpolation driven by the reader's scroll (lollipop-drive.mjs, verbatim):
//
//   1 before   the earlier stems grow from zero, one per pair;
//   2 after    the later stems grow beside them;
//   3 pair     the subject and the pair it is compared with drawn to the centre, the others leaving;
//   4 ratio    the two ratios measured between them (other ÷ subject, earlier then later);
//   5 change   every pair back, each with its direction of change, a triangle and its percentage;
//   6 reading  the plate stands; the card states the accounting (the limits).
//
// This file computes every figure the cards may state (the changes, the two ratios, the growth of the
// subject) and checks the words against them; ./beat.mjs — the one file the model writes — gives the
// pairs and the WORDS of each card. Copied into the beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { webRegisters } from "#shared/design-base/web.mjs";
import { EYEBROW_TO_DISPLAY, gapOf, registerOf } from "#shared/design-base/register.mjs";
import { DirectedLollipopScrolly } from "./DirectedLollipopScrolly.tsx";
import { applyStoryboard, assertNumbers, assertLegibleLabels, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { plain, refusing, storyLanguage } from "./web.mjs";
import { renderBeatScrolly, scrollySkill } from "./scrolly.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The cards, in the drive's order: the runner's own ids (never the model's words in an id). */
const CARDS = ["before", "after", "pair", "ratio", "change", "reading"];
/** One state per card; see lollipop-drive.mjs for what each field paints. The worked example's, verbatim. */
const STATES = [
  { before: 1, after: 0, pair: 0, ratio: 0, change: 0, share: 0 },
  { before: 1, after: 1, pair: 0, ratio: 0, change: 0, share: 0 },
  { before: 1, after: 1, pair: 1, ratio: 0, change: 0, share: 0 },
  { before: 1, after: 1, pair: 1, ratio: 1, change: 0, share: 0 },
  { before: 1, after: 1, pair: 0, ratio: 0, change: 1, share: 0 },
  { before: 1, after: 1, pair: 0, ratio: 0, change: 1, share: 1 },
];
/** The header notes: shown on card 4, card 5, card 6. */
const NOTE_KEYS = [["ratio", "pairNote"], ["change", "changeNote"], ["share", "shareNote"]];

await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderScrolly } = await import(scrollySkill(HERE, "scripts", "render-scrolly.mjs"));

  const REQUIRED = ["eyebrow", "pairs", "subject", "other", "from", "to", "unit", "rule", "format", "cards", "notes", "beforeRatio", "afterRatio", "title", "limits", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")} (see CONTRACT.md)`);
  for (const fn of ["format", "beforeRatio", "afterRatio", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  if (beat.formatChange !== undefined && typeof beat.formatChange !== "function") throw new Error(`beat.mjs: formatChange must be a function (see CONTRACT.md)`);
  for (const [group, keys] of [["cards", CARDS.slice(0, 5)], ["notes", NOTE_KEYS.map(([k]) => k)]]) {
    const absent = keys.filter((k) => typeof beat[group]?.[k] !== "function");
    if (absent.length) throw new Error(`beat.mjs: ${group} must give a function for each of ${keys.join(", ")}; missing or not a function: ${absent.join(", ")} (see CONTRACT.md)`);
  }

  // ── the pairs (the static kit's refusals) ───────────────────────────────────────────────────────
  if (!Array.isArray(beat.pairs) || beat.pairs.length < 2 || beat.pairs.length > 8)
    throw new Error(`pairs holds ${beat.pairs?.length ?? 0} entities; a lollipop plate draws 2 to 8 pairs side by side. Keep the subject and the largest others, and say in rule how they were chosen`);
  assertNumbers(beat.pairs.flatMap((p) => [[`${p.key} before`, p.before], [`${p.key} after`, p.after]]));
  const keys = beat.pairs.map((p) => String(p.key));
  if (new Set(keys).size !== keys.length) throw new Error(`two pairs share a key (${keys.join(", ")}): one pair per entity — filter data.json to one row per entity`);
  if (!keys.includes(String(beat.subject))) throw new Error(`subject ${JSON.stringify(beat.subject)} is not the key of any pair (${keys.join(", ")})`);
  if (!keys.includes(String(beat.other)) || String(beat.other) === String(beat.subject))
    throw new Error(`other ${JSON.stringify(beat.other)} must be the key of the pair the subject is compared with on cards 3 and 4, not the subject itself (${keys.join(", ")})`);
  const negative = beat.pairs.filter((p) => p.before < 0 || p.after < 0);
  if (negative.length) throw new Error(`${negative.map((p) => p.key).join(", ")} hold a negative value: a lollipop stem is a height from zero. A change that crosses zero is a diverging bar, not a lollipop`);
  const fromZero = beat.pairs.filter((p) => p.before === 0);
  if (fromZero.length) throw new Error(`${fromZero.map((p) => p.key).join(", ")} start at 0, so their change in per cent is undefined: leave them out and say so in limits`);
  if (String(beat.from) === String(beat.to)) throw new Error(`from and to are both ${beat.from}: the two states must differ`);
  if (beat.share !== undefined && !Number.isFinite(beat.share)) throw new Error(`share is ${beat.share}: a number computed from data.json, or leave it out`);

  // ── the readings ────────────────────────────────────────────────────────────────────────────────
  const readings = beat.pairs.map((p, index) => Object.freeze({
    key: String(p.key),
    name: plain(p.name),
    index,
    before: p.before,
    after: p.after,
    change: ((p.after - p.before) / p.before) * 100,
    isSubject: String(p.key) === String(beat.subject),
  }));
  const subject = readings.find((p) => p.isSubject);
  const other = readings.find((p) => p.key === String(beat.other));
  if (!(subject.after > 0)) throw new Error(`the subject's later value is ${subject.after}: card 4 measures other ÷ subject, which needs it above zero`);
  const top = Math.max(...readings.flatMap((p) => [p.before, p.after]));
  const step = 5 * 10 ** (Math.floor(Math.log10(top)) - 1);
  const reading = Object.freeze({
    count: readings.length,
    pairs: readings,
    subject,
    other,
    ratioBefore: other.before / subject.before,
    ratioAfter: other.after / subject.after,
    grew: subject.after / subject.before,
    rose: readings.filter((p) => p.change > 0),
    fell: readings.filter((p) => p.change < 0),
    share: beat.share ?? null,
    max: Math.ceil(top / step) * step,
  });

  const format = (v) => plain(beat.format(v));
  assertLegibleLabels(readings.flatMap((p) => [p.before, p.after]), format);
  beat.check(reading);
  assertDrawsClaimColumn(readings.flatMap((p) => [p.before, p.after]), HERE);

  // ── the words, each passed through plain(); every number they state is checked ───────────────────
  const say = (field, value) => {
    const text = typeof value === "function" ? value(reading) : value;
    const parts = [text].flat();
    if (!parts.length || parts.some((p) => typeof p !== "string" || !p.trim())) throw new Error(`${field} must return a non-empty sentence (or an array of paragraphs); it returned ${JSON.stringify(text)}`);
    return parts.map(plain);
  };
  const prose = [...CARDS.slice(0, 5).map((k) => say(`cards.${k}`, beat.cards[k])), say("limits", [beat.limits].flat()[0])];
  const cardText = prose.map((p) => p.join(" "));
  const notes = Object.fromEntries(NOTE_KEYS.map(([k, slot]) => [slot, say(`notes.${k}`, beat.notes[k]).join(" ")]));
  const beforeRatio = say("beforeRatio", beat.beforeRatio).join(" ");
  const afterRatio = say("afterRatio", beat.afterRatio).join(" ");
  const rule = say("rule", beat.rule).join(" ");

  // What each card is ABOUT, so it must say it: the figure its gesture puts on screen.
  const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const has = (text, wanted) => new RegExp(`(?<![\\d.,])${escape(wanted)}(?![\\d])`).test(text);
  const names = (text, ps) => ps.filter((p) => !text.toLocaleLowerCase().includes(p.name.toLocaleLowerCase()));
  const owe = (where, text, ok, what) => {
    if (!ok) throw new Error(`${where} must state ${what}; it says: ${text}`);
  };
  const card = (i) => `card ${i + 1} (cards.${CARDS[i]})`;
  owe(card(0), cardText[0], has(cardText[0], format(subject.before)) && has(cardText[0], format(other.before)), `the earlier values of the subject and of the other pair, "${format(subject.before)}" and "${format(other.before)}" — the stems its picture grows`);
  owe(card(1), cardText[1], has(cardText[1], format(subject.after)) && has(cardText[1], format(other.after)), `the later values of the subject and of the other pair, "${format(subject.after)}" and "${format(other.after)}"`);
  owe(card(2), cardText[2], !names(cardText[2], [subject, other]).length, `the names of the two pairs it draws together, ${subject.name} and ${other.name}`);
  owe(card(3), cardText[3], has(cardText[3], format(reading.ratioBefore)) && has(cardText[3], format(reading.ratioAfter)), `both ratios, "${format(reading.ratioBefore)}" and "${format(reading.ratioAfter)}" (r.ratioBefore, r.ratioAfter through format())`);
  const missed = names(cardText[4], [...reading.rose, ...reading.fell]);
  owe(card(4), cardText[4], !missed.length, `the name of every pair whose value rose or fell — it shows each one's direction (missing: ${missed.map((p) => p.name).join(", ")})`);
  owe("beforeRatio", beforeRatio, has(beforeRatio, format(reading.ratioBefore)), `r.ratioBefore through format(), "${format(reading.ratioBefore)}"`);
  owe("afterRatio", afterRatio, has(afterRatio, format(reading.ratioAfter)), `r.ratioAfter through format(), "${format(reading.ratioAfter)}"`);

  // Every other figure must be one this kit computed, at the precision it is written with, sign
  // aside. A year (1900–2100) and a figure glued to letters pass.
  // The decimal mark the words use: read off format(1.5), or — when format prints whole numbers — the language.
  const sample = plain(beat.format(1.5));
  const decimal = /\d,\d/.test(sample) ? "," : /\d\.\d/.test(sample) ? "." : /,/.test(new Intl.NumberFormat(beat.lang ?? storyLanguage(HERE) ?? "en").format(1.5)) ? "," : ".";
  const group = decimal === "," ? "[ .]" : "[ ,]";
  const known = [
    reading.count, reading.rose.length, reading.fell.length, reading.ratioBefore, reading.ratioAfter, reading.grew, reading.max,
    ...(reading.share === null ? [] : [reading.share]),
    ...readings.flatMap((p) => [p.before, p.after, p.change]),
  ].map(Math.abs);
  const dec = decimal === "." ? "\\." : ",";
  const figure = new RegExp(`(?<![\\p{L}\\d.,])(\\d{1,3}(?:${group}\\d{3})+(?:${dec}\\d+)?|\\d+(?:${dec}\\d+)?)(?![\\p{L}\\d])`, "gu");
  const checkFigures = (where, text) => {
    for (const m of plain(text).matchAll(figure)) {
      const raw = m[1];
      const [whole, frac = ""] = raw.split(decimal);
      const n = Number(`${whole.replace(/[ .,]/g, "")}.${frac || "0"}`);
      if (!frac && Number.isInteger(n) && n >= 1900 && n <= 2100) continue;
      const tolerance = 0.5 * 10 ** -frac.length + 1e-9;
      if (!known.some((v) => Math.abs(v - n) <= tolerance))
        throw new Error(`${where} states ${raw}, which no figure of these pairs rounds to: every number in a card is computed — use the reading (r.subject.before, r.other.after, r.ratioBefore, r.ratioAfter, r.grew, r.share, …) through format(), never a typed or recomputed value. It says: ${text}`);
    }
  };
  CARDS.slice(0, 5).forEach((k, i) => checkFigures(card(i), cardText[i]));
  NOTE_KEYS.forEach(([k, slot]) => checkFigures(`notes.${k}`, notes[slot]));
  checkFigures("beforeRatio", beforeRatio);
  checkFigures("afterRatio", afterRatio);
  checkFigures("rule", rule);

  const titleForms = [beat.title].flat().map(plain);
  // The title may state the ratios or the subject's growth — figures card 4 draws between the heads.
  assertHeadlineNumbersDrawn(titleForms[0], [...readings.flatMap((p) => [p.before, p.after]), reading.ratioBefore, reading.ratioAfter, reading.grew], "pairs");

  const eyebrow = plain(beat.eyebrow);
  const source = plain(beat.source);
  const unit = plain(beat.unit);
  const alt = plain(typeof beat.alt === "function" ? beat.alt(reading) : beat.alt);
  checkFigures("alt", alt);

  // The component's pairs: the runner's own keys (the drive writes them into selectors unescaped).
  const changeText = (v) => plain(beat.formatChange ? beat.formatChange(v) : `${v >= 0 ? "+" : "−"}${Math.round(Math.abs(v))} %`);
  const keyOf = (p) => `p${p.index}`;
  const shaped = readings.map((p) => ({ code: keyOf(p), name: p.name, before: p.before, after: p.after, change: p.change, beforeText: format(p.before), afterText: format(p.after), changeText: changeText(p.change) }));
  const words = { unit, rule, beforeRatio, afterRatio, ...notes };
  const years = [plain(beat.from), plain(beat.to)];

  const textPerRegister = {
    display: titleForms.join(" "),
    eyebrow,
    body: `${prose.flat().join(" ")} ${source}`,
    axis: `${unit} ${rule} ${years.join(" ")}`,
    annot: shaped.map((p) => p.name).join(" "),
    value: `${shaped.map((p) => `${p.beforeText} ${p.afterText} ${p.changeText}`).join(" ")} ${beforeRatio} ${afterRatio} ${Object.values(notes).join(" ")}`,
  };

  const driver = readFileSync(join(HERE, "lollipop-drive.mjs"), "utf8");
  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
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
          element: createElement(DirectedLollipopScrolly, { pairs: shaped, subject: keyOf(subject), other: keyOf(other), years, max: reading.max, words, alt, regs, stroke: direction.stroke ?? {}, ground: direction.ground, accent: direction.accent, ink, muted }),
          states: STATES,
          driver,
          apply: "applyLollipopState",
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
