// The generic half of a sankey SCROLLY beat, taken from
// proof/scrolly-sankey-electricity-sources/render-directions-scrolly.mjs with everything about ITS
// subject removed. The choreography is the worked example's and is not the model's to change — six
// cards, one continuous interpolation driven by the reader's scroll (sankey-drive.mjs, verbatim):
//
//   1 rails    the two rails alone, the same total on both;
//   2 tracked  the tracked source's ribbons only, each one's share of it written at the target rail;
//   3 web      every other ribbon;
//   4 first    read back from the tracked flow's target: its ribbons alone, each one's share written;
//   5 second   read back from a second target the same way;
//   6 reading  the plate; the card states the accounting (the limits).
//
// This file computes every figure the cards may state (the node totals — conservation holds by
// construction — the tracked source's split, each target's mix) and checks the words against them;
// ./beat.mjs — the one file the model writes — gives the data and the WORDS of each card. Copied into
// the beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { deriveFurniture } from "#shared/chart-beat/render-still.mjs";
import { webRegisters } from "#shared/design-base/web.mjs";
import { EYEBROW_TO_DISPLAY, gapOf, registerOf } from "#shared/design-base/register.mjs";
import { DirectedSankeyScrolly } from "./DirectedSankeyScrolly.tsx";
import { applyStoryboard, assertNumbers, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { plain, refusing, storyLanguage } from "./web.mjs";
import { renderBeatScrolly, scrollySkill } from "./scrolly.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));

/** The cards, in the drive's order: the runner's own ids (never the model's words in an id). */
const CARDS = ["rails", "tracked", "web", "first", "second", "reading"];
/** One state per card; see sankey-drive.mjs for what each field paints. The worked example's, verbatim. */
const STATES = [
  { source: 0, shares: 0, web: 0, focus0: 0, focus1: 0, note: 0 },
  { source: 1, shares: 1, web: 0, focus0: 0, focus1: 0, note: 1 },
  { source: 1, shares: 0, web: 1, focus0: 0, focus1: 0, note: 2 },
  { source: 1, shares: 0, web: 1, focus0: 1, focus1: 0, note: 3 },
  { source: 1, shares: 0, web: 1, focus0: 0, focus1: 1, note: 4 },
  { source: 1, shares: 0, web: 1, focus0: 0, focus1: 0, note: -1 },
];
/** The component's header-note slots, cards 1 to 5 (card 6 reads none). */
const NOTE_SLOTS = ["railNote", "sourceNote", "webNote", "subjectNote", "otherNote"];
/** A ribbon's share of its target is written only from this share up: under it the label would sit on a hairline. */
const WRITTEN_FROM = 2;

await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderScrolly } = await import(scrollySkill(HERE, "scripts", "render-scrolly.mjs"));

  const REQUIRED = ["eyebrow", "sources", "targets", "flows", "tracked", "second", "unit", "format", "formatShare", "cards", "notes", "title", "limits", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")} (see CONTRACT.md)`);
  for (const fn of ["format", "formatShare", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);
  if (beat.formatWholeShare !== undefined && typeof beat.formatWholeShare !== "function") throw new Error(`beat.mjs: formatWholeShare must be a function (see CONTRACT.md)`);
  for (const group of ["cards", "notes"]) {
    const keys = CARDS.slice(0, 5);
    const absent = keys.filter((k) => typeof beat[group]?.[k] !== "function");
    if (absent.length) throw new Error(`beat.mjs: ${group} must give a function for each of ${keys.join(", ")}; missing or not a function: ${absent.join(", ")} (see CONTRACT.md)`);
  }

  // ── the nodes and the flows ───────────────────────────────────────────────────────────────────
  for (const [side, list] of [["sources", beat.sources], ["targets", beat.targets]]) {
    if (!Array.isArray(list) || list.length < 2 || list.length > 12)
      throw new Error(`${side} holds ${list?.length ?? 0} nodes; a rail here labels 2 to 12. Group the smallest into one "other" node, computed, and say so in limits`);
    const keys = list.map((n) => String(n.key));
    if (new Set(keys).size !== keys.length) throw new Error(`two ${side} share a key (${keys.join(", ")})`);
  }
  const sourceKeys = beat.sources.map((n) => String(n.key));
  const targetKeys = beat.targets.map((n) => String(n.key));
  const clash = sourceKeys.filter((k) => targetKeys.includes(k));
  if (clash.length) throw new Error(`${clash.join(", ")} is both a source and a target key: a target's key must differ from every source's`);
  if (!Array.isArray(beat.flows) || !beat.flows.length) throw new Error(`flows must hold one { from, to, value } per ribbon`);
  assertNumbers(beat.flows.map((f) => [`${f.from}→${f.to}`, f.value]), "flows");
  const pairs = new Set();
  for (const f of beat.flows) {
    if (!sourceKeys.includes(String(f.from))) throw new Error(`a flow comes from ${JSON.stringify(f.from)}, which is not a source key (${sourceKeys.join(", ")})`);
    if (!targetKeys.includes(String(f.to))) throw new Error(`a flow goes to ${JSON.stringify(f.to)}, which is not a target key (${targetKeys.join(", ")})`);
    if (f.value < 0) throw new Error(`the flow ${f.from} → ${f.to} is negative: a ribbon has a width, not a sign. A net change is a diverging bar`);
    const pair = `${f.from}|${f.to}`;
    if (pairs.has(pair)) throw new Error(`two flows for ${f.from} → ${f.to}: data.json holds several years or series — filter its rows to one`);
    pairs.add(pair);
  }
  const flowsIn = beat.flows.map((f) => ({ from: String(f.from), to: String(f.to), value: f.value }));
  const totalOf = (side, key) => flowsIn.filter((f) => f[side] === key).reduce((s, f) => s + f.value, 0);
  const sourcesIn = beat.sources.map((n) => ({ key: String(n.key), label: n.label, total: totalOf("from", String(n.key)) }));
  const targetsIn = beat.targets.map((n) => ({ key: String(n.key), label: n.label, total: totalOf("to", String(n.key)) })).sort((a, b) => b.total - a.total);
  const empty = [...sourcesIn, ...targetsIn].filter((n) => !(n.total > 0));
  if (empty.length) throw new Error(`${empty.map((n) => n.label).join(", ")} has no flow: every node on a rail carries at least one ribbon — leave it out`);
  const grand = flowsIn.reduce((s, f) => s + f.value, 0);

  const from = String(beat.tracked?.from);
  const to = String(beat.tracked?.to);
  const trackedFlow = flowsIn.find((f) => f.from === from && f.to === to);
  if (!sourceKeys.includes(from) || !targetKeys.includes(to) || !trackedFlow || !(trackedFlow.value > 0))
    throw new Error(`tracked must be { from: <source key>, to: <target key> } of a flow above zero — the ONE flow the takeaway is about; it is ${JSON.stringify(beat.tracked)}`);
  const second = String(beat.second);
  if (!targetKeys.includes(second)) throw new Error(`second is ${JSON.stringify(beat.second)}, which is not a target key (${targetKeys.join(", ")}): card 5 reads back from a second target`);
  if (second === to) throw new Error(`second is the tracked flow's own target: card 4 reads back from ${to}, card 5 from ANOTHER target`);

  const node = (list, key) => list.find((n) => n.key === key);
  const trackedTotal = node(sourcesIn, from).total;
  const into = Object.fromEntries(
    targetsIn.map((t) => [
      t.key,
      flowsIn
        .filter((f) => f.to === t.key)
        .map((f) => ({ key: f.from, label: node(sourcesIn, f.from).label, value: f.value, share: (f.value / t.total) * 100 }))
        .sort((a, b) => b.value - a.value),
    ]),
  );
  const shareIn = (targetKey) => (into[targetKey].find((x) => x.key === from)?.share ?? 0);
  const recipients = flowsIn
    .filter((f) => f.from === from && f.value > 0)
    .map((f) => ({ key: f.to, label: node(targetsIn, f.to).label, value: f.value, share: (f.value / trackedTotal) * 100 }))
    .sort((a, b) => b.value - a.value);
  const targetOf = (key) => ({ ...node(targetsIn, key), trackedShare: shareIn(key), mix: into[key] });
  const reading = {
    grand,
    sourceCount: sourcesIn.length,
    targetCount: targetsIn.length,
    flowCount: flowsIn.length,
    sources: sourcesIn.map((n) => ({ ...n })),
    targets: targetsIn.map((n) => ({ ...n })),
    ranked: [...sourcesIn].sort((a, b) => b.total - a.total).map((n) => ({ ...n })),
    tracked: {
      from,
      to,
      sourceLabel: node(sourcesIn, from).label,
      targetLabel: node(targetsIn, to).label,
      sourceTotal: trackedTotal,
      value: trackedFlow.value,
      ofSource: (trackedFlow.value / trackedTotal) * 100,
      ofTarget: shareIn(to),
    },
    recipients,
    others: recipients.filter((x) => x.key !== to),
    first: targetOf(to),
    second: targetOf(second),
    into,
  };
  Object.freeze(reading);
  beat.check(reading);
  assertDrawsClaimColumn(flowsIn.map((f) => f.value), HERE);

  // ── the words, each passed through plain(); every number they state is checked ───────────────────
  const say = (field, value) => {
    const text = typeof value === "function" ? value(reading) : value;
    const parts = [text].flat();
    if (!parts.length || parts.some((p) => typeof p !== "string" || !p.trim())) throw new Error(`${field} must return a non-empty sentence (or an array of paragraphs); it returned ${JSON.stringify(text)}`);
    return parts.map(plain);
  };
  const format = (v) => plain(beat.format(v));
  const formatShare = (v) => plain(beat.formatShare(v));
  const formatWholeShare = (v) => plain(beat.formatWholeShare ? beat.formatWholeShare(v) : `${Math.round(v)} %`);
  const prose = [...CARDS.slice(0, 5).map((k) => say(`cards.${k}`, beat.cards[k])), say("limits", [beat.limits].flat()[0])];
  const notes = Object.fromEntries(CARDS.slice(0, 5).map((k, i) => [NOTE_SLOTS[i], say(`notes.${k}`, beat.notes[k]).join(" ")]));
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
  owes(0, "r.grand", grand);
  owes(1, "r.tracked.sourceTotal", trackedTotal);
  owes(1, "r.tracked.value", trackedFlow.value);
  owes(1, "r.tracked.ofSource", reading.tracked.ofSource);
  owes(2, "r.flowCount", flowsIn.length);
  owes(3, "r.first.trackedShare", reading.first.trackedShare);
  owes(4, "r.second.mix[0].share", reading.second.mix[0].share);

  // Every other figure a card, a note or the alt text states must be one this kit computed, at the
  // precision it is written with: a total, a flow, a share of a source or of a target, a count.
  // A year (1900–2100) and a figure glued to letters pass.
  const known = [
    grand, sourcesIn.length, targetsIn.length, flowsIn.length, WRITTEN_FROM,
    ...sourcesIn.map((n) => n.total), ...targetsIn.map((n) => n.total),
    ...flowsIn.flatMap((f) => [f.value, (f.value / node(sourcesIn, f.from).total) * 100, (f.value / node(targetsIn, f.to).total) * 100]),
  ];
  const checkFigures = (where, text) => {
    for (const f of figuresOf(text)) {
      if (!f.frac && Number.isInteger(f.n) && f.n >= 1900 && f.n <= 2100) continue;
      if (!known.some((v) => within(f, v)))
        throw new Error(`${where} states ${f.raw}, which no figure of this sankey rounds to: every number in a card is computed — use the reading (r.grand, r.tracked.value, r.tracked.ofSource, r.second.mix[i].share, …) through format() / formatShare(), never a typed or recomputed value. It says: ${text}`);
    }
  };
  CARDS.slice(0, 5).forEach((k, i) => checkFigures(`card ${i + 1} (cards.${k})`, cardText(i)));
  CARDS.slice(0, 5).forEach((k, i) => checkFigures(`notes.${k}`, notes[NOTE_SLOTS[i]]));

  const titleForms = [beat.title].flat().map(plain);
  // The title states the tracked flow's share of its source, which card 2 writes on the plate.
  assertHeadlineNumbersDrawn(titleForms[0], [trackedFlow.value, trackedTotal, reading.tracked.ofSource, reading.tracked.ofTarget, ...flowsIn.map((f) => f.value)], "ribbons");

  const eyebrow = plain(beat.eyebrow);
  const source = plain(beat.source);
  const alt = plain(typeof beat.alt === "function" ? beat.alt(reading) : beat.alt);
  checkFigures("alt", alt);
  // Keys are the runner's own (s1…, t1…): the drive joins them with "|" and escapes them in selectors.
  const sKey = new Map(sourcesIn.map((n, i) => [n.key, `s${i + 1}`]));
  const tKey = new Map(targetsIn.map((n, i) => [n.key, `t${i + 1}`]));
  const sources = sourcesIn.map((n) => ({ key: sKey.get(n.key), label: plain(n.label), total: n.total, totalText: format(n.total) }));
  const targets = targetsIn.map((n) => ({ key: tKey.get(n.key), label: plain(n.label), total: n.total, totalText: format(n.total) }));
  const flows = flowsIn.map((f) => {
    const ofSource = (f.value / node(sourcesIn, f.from).total) * 100;
    const ofTarget = (f.value / node(targetsIn, f.to).total) * 100;
    return {
      from: sKey.get(f.from),
      to: tKey.get(f.to),
      value: f.value,
      ofSource: f.from === from ? formatWholeShare(ofSource) : "",
      valueText: format(f.value),
      ofTarget: ofTarget >= WRITTEN_FROM ? formatShare(ofTarget) : "",
      fromLabel: plain(node(sourcesIn, f.from).label),
    };
  });
  const words = { unit: plain(beat.unit), ...notes };

  const textPerRegister = {
    display: titleForms.join(" "),
    eyebrow,
    body: `${prose.flat().join(" ")} ${source}`,
    axis: words.unit,
    annot: [...sources, ...targets].map((n) => n.label).join(" "),
    value: `${[...sources, ...targets].map((n) => n.totalText).join(" ")} ${flows.map((f) => `${f.valueText} · ${f.ofSource} ${f.ofTarget}`).join(" ")} ${Object.values(notes).join(" ")}`,
  };

  const driver = readFileSync(join(HERE, "sankey-drive.mjs"), "utf8");
  await renderBeatScrolly({
    here: HERE,
    states: STATES,
    textPerRegister,
    evidenceLevels: beat.evidenceLevels ?? 3,
    async render({ label, direction, outDir }) {
      const { ink, muted } = deriveFurniture(direction.ground);
      const regs = webRegisters(direction, { ink: { ink, muted, accent: direction.accent } });
      const { outPath } = await renderScrolly({
        steps: prose.map((p, i) => ({ id: CARDS[i], prose: p })),
        reveal: {
          element: createElement(DirectedSankeyScrolly, { sources, targets, flows, tracked: { from: sKey.get(from), to: tKey.get(to) }, focus: [tKey.get(to), tKey.get(second)], words, alt, regs, ground: direction.ground, accent: direction.accent, ink, muted }),
          states: STATES,
          driver,
          apply: "applySankeyState",
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
