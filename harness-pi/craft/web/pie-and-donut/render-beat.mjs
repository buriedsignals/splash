// The generic half of a pie-and-donut WEB beat, taken from
// proof/web-donut-world-co2-share/render-directions-web.mjs with everything about ITS subject
// removed. The interaction is the worked example's and is not the model's to change: two concentric
// rings (the first state inside, the second outside) share a centre and an angular scale, each closed
// by a remainder wedge, the two wholes written in the hole; a "follow a part" control rings the chosen
// part on BOTH rings and lays, from its own wedge start, a reference band sweeping the share it held
// on the OTHER ring (CSS only, works without JS); every wedge answers hover/tap/Tab with its share,
// its absolute value and the other ring's. This file computes the wedges, the bands, the ranks and the
// tones; ./beat.mjs — the one file the model writes — gives the parts and WORDS every reading. Copied
// into the beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { skillScriptFrom } from "#shared/design-base/skill-script.mjs";
import { DirectedDonutWeb, rampForTones, assertRampIsSeparable } from "./DirectedDonutWeb.tsx";
import { applyStoryboard, assertNumbers, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { chartWeb, plain, refusing, renderBeatWeb, storyLanguage } from "./web.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const TURN = Math.PI * 2;
await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderWeb } = await import(chartWeb(HERE, "scripts", "render-web.mjs"));
  const { levelSlugOf } = await import(skillScriptFrom(HERE, "chart-web", "assets", "level.ts"));

  const REQUIRED = ["eyebrow", "parts", "wholeBefore", "wholeAfter", "subject", "counterpart", "from", "to", "restName", "formatShare", "centreNote", "detail", "levelLabel", "noneLabel", "announce", "note", "title", "limits", "reading", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")} (see CONTRACT.md)`);
  for (const fn of ["formatShare", "detail", "announce", "note", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);

  // ── the parts: every member of the partition, so the remainder is computed, never typed ─────────
  assertNumbers(beat.parts.flatMap((p) => [[`${p.name} before`, p.before], [`${p.name} after`, p.after]]));
  assertNumbers([["wholeBefore", beat.wholeBefore], ["wholeAfter", beat.wholeAfter]], "wholes");
  const negative = beat.parts.find((p) => p.before < 0 || p.after < 0);
  if (negative) throw new Error(`${negative.name} has a negative value: a share of a whole cannot be negative — a pie draws parts, not balances`);
  const keys = beat.parts.map((p) => String(p.key));
  if (new Set(keys).size !== keys.length) throw new Error(`parts holds the same key twice: one row per part (filter data.json to one series)`);
  const DRAWN = beat.drawCount ?? 6;
  if (!(Number.isInteger(DRAWN) && DRAWN >= 2 && DRAWN <= 6))
    throw new Error(`drawCount is ${beat.drawCount}: name 2 to 6 parts (each ring adds the remainder; past seven wedges the angles blur)`);
  if (beat.parts.length <= DRAWN) throw new Error(`parts holds ${beat.parts.length} members and ${DRAWN} are named: the remainder would hold nobody — give parts EVERY member of the whole, or lower drawCount`);
  const sum = (pick) => beat.parts.reduce((s, p) => s + pick(p), 0);
  for (const [field, pick] of [["wholeBefore", (p) => p.before], ["wholeAfter", (p) => p.after]])
    if (!(beat[field] > 0) || sum(pick) > beat[field] * 1.001)
      throw new Error(`${field} is ${beat[field]}, but the parts add up to ${sum(pick)}: it must be the whole the parts belong to (the sum of every member, or the table's total row)`);

  const ranked = [...beat.parts].sort((a, b) => b.after - a.after);
  const order = ranked.slice(0, DRAWN).map((p, i) => ({ ...p, code: `p${i + 1}`, name: plain(p.name) }));
  const subject = order.find((p) => String(p.key) === String(beat.subject));
  const counterpart = order.find((p) => String(p.key) === String(beat.counterpart));
  if (!subject) throw new Error(`subject ${JSON.stringify(beat.subject)} is not among the ${DRAWN} parts named (${order.map((p) => p.key).join(", ")})`);
  if (!counterpart) throw new Error(`counterpart ${JSON.stringify(beat.counterpart)} is not among the ${DRAWN} parts named (${order.map((p) => p.key).join(", ")})`);
  if (subject === counterpart) throw new Error(`subject and counterpart are the same part: the counterpart is the OTHER part the takeaway compares it with`);
  const REST = "rest";
  const restName = plain(beat.restName);
  const restOption = plain(beat.restOption ?? beat.restName);
  const restCount = beat.parts.length - DRAWN;
  const biggestRest = ranked[DRAWN];

  const RING = [
    { key: "r1", label: plain(beat.from), inner: 62, outer: 108, pick: (p) => p.before, world: beat.wholeBefore },
    { key: "r2", label: plain(beat.to), inner: 116, outer: 168, pick: (p) => p.after, world: beat.wholeAfter },
  ];
  const restOf = (ring) => ring.world - order.reduce((s, p) => s + ring.pick(p), 0);
  for (const ring of RING)
    if (!(restOf(ring) > ring.world * 0.001)) throw new Error(`on the ${ring.label} ring the named parts already make the whole: the remainder wedge would be empty — lower drawCount`);

  // ── the wedges, in the second state's order, each with the other ring's reading ────────────────
  const valueOn = (key, ring) => (key === REST ? restOf(ring) : ring.pick(order.find((p) => p.code === key)));
  const wedges = [];
  RING.forEach((ring, ri) => {
    const slices = [...order.map((p) => ({ key: p.code, name: p.name, value: ring.pick(p) })), { key: REST, name: restName, value: restOf(ring) }];
    let a = 0;
    for (const s of slices) {
      const span = (s.value / ring.world) * TURN;
      wedges.push({ key: s.key, name: s.name, ring: ri, from: a, to: a + span, value: s.value });
      a += span;
    }
  });
  const rankIn = (ri) => new Map(wedges.filter((w) => w.ring === ri).sort((a, b) => b.value - a.value).map((w, i) => [w.key, i + 1]));
  const ranks = [rankIn(0), rankIn(1)];
  for (const w of wedges) {
    const ring = RING[w.ring];
    const other = RING[1 - w.ring];
    const otherValue = valueOn(w.key, other);
    w.detail = plain(
      beat.detail({
        name: w.name,
        isRest: w.key === REST,
        label: ring.label,
        share: (w.value / ring.world) * 100,
        value: w.value,
        whole: ring.world,
        rank: ranks[w.ring].get(w.key),
        otherLabel: other.label,
        otherShare: (otherValue / other.world) * 100,
        otherValue,
        otherWhole: other.world,
      }),
    );
  }
  const details = new Set(wedges.map((w) => w.detail));
  if (details.size !== wedges.length) throw new Error(`two wedges answer with the same words: detail() must start with the part's name and its ring's label`);

  /** One part's reading on both rings: what the control's sentence and the chip are built from. */
  const readingOf = (key, name) => {
    const v = [valueOn(key, RING[0]), valueOn(key, RING[1])];
    const s = [(v[0] / RING[0].world) * 100, (v[1] / RING[1].world) * 100];
    return {
      name,
      isRest: key === REST,
      from: RING[0].label,
      to: RING[1].label,
      shareBefore: s[0],
      shareAfter: s[1],
      valueBefore: v[0],
      valueAfter: v[1],
      wholeBefore: RING[0].world,
      wholeAfter: RING[1].world,
      factor: s[0] === 0 ? null : s[1] / s[0],
      // The share falls while the value behind it rises — the trap a share chart sets when the whole grows.
      crossed: s[1] < s[0] && v[1] > v[0],
      rankBefore: ranks[0].get(key),
      rankAfter: ranks[1].get(key),
      of: DRAWN + 1,
      restCount,
      biggestRest: { name: plain(biggestRest.name), shareAfter: (biggestRest.after / RING[1].world) * 100 },
    };
  };

  const parts = order.map((p) => ({ key: p.key, ...readingOf(p.code, p.name) }));
  const rest = readingOf(REST, restName);
  const wholeGrowth = (beat.wholeAfter / beat.wholeBefore - 1) * 100;
  const checkArgs = { parts, rest, wholeGrowth };
  beat.check(checkArgs);
  assertDrawsClaimColumn(order.flatMap((p) => [p.before, p.after]), HERE);
  assertHeadlineNumbersDrawn([beat.title].flat()[0], [...wedges.map((w) => (w.value / RING[w.ring].world) * 100), ...wedges.map((w) => w.value), beat.wholeBefore, beat.wholeAfter], "wedges");

  // ── the yardstick: every named part and the remainder, each laying a band on both rings ────────
  const levelOptionFor = (key, label) => {
    const r = readingOf(key, label);
    const here = [wedges.find((w) => w.key === key && w.ring === 0), wedges.find((w) => w.key === key && w.ring === 1)];
    const share = [plain(beat.formatShare(r.shareBefore)), plain(beat.formatShare(r.shareAfter))];
    const option = {
      key,
      label,
      share,
      announce: plain(beat.announce(r)),
      note: plain(beat.note(r)),
      marks: RING.map((ring, ri) => {
        const other = here[1 - ri];
        const end = here[ri].from + (other.to - other.from);
        return { series: ring.key, angle: ((end % TURN) + TURN) % TURN };
      }),
    };
    if (!option.announce.includes(label)) throw new Error(`announce() must contain the option's label "${label}" word for word; it says: ${option.announce}`);
    for (const s of share)
      if (!option.note.includes(s)) throw new Error(`note() for ${label} must state both shares as formatShare prints them ("${share[0]}", "${share[1]}"); it says: ${option.note}`);
    return option;
  };
  const levels = {
    label: plain(beat.levelLabel),
    noneLabel: plain(beat.noneLabel),
    options: [...order.map((p) => levelOptionFor(p.code, p.name)), levelOptionFor(REST, restOption)],
  };

  const centreNote = [beat.centreNote].flat().map(plain);
  if (centreNote.length < 1 || centreNote.length > 3) throw new Error(`centreNote holds ${centreNote.length} lines; the hole holds 1 to 3 (the two wholes, and their change)`);
  for (const line of centreNote)
    if (line.length > 24) throw new Error(`centreNote line "${line}" is ${line.length} characters; the hole holds about 24 — say the whole and its unit only`);

  const title = plain([beat.title].flat()[0]);
  const caveat = plain([beat.limits].flat()[0]);
  const source = plain(beat.source);
  const reading = plain(beat.reading);
  const eyebrow = plain(beat.eyebrow);
  const alt = plain(typeof beat.alt === "function" ? beat.alt(checkArgs) : beat.alt);

  const interaction = {
    earns:
      `A still can draw two rings and ASSERT how ${subject.name} and ${counterpart.name} moved; it cannot let the reader ask which of the ${DRAWN + 1} parts moved, ` +
      `by how much, or whether its value rose while its share fell. Here the reader lays one ring's share on the other ring and sees the two arcs miss.`,
    controls: [
      {
        question: "And the other parts — how did each move from one ring to the other?",
        gesture: "find-your-own-case",
        changes: "The chosen part is ringed on both rings at once, and a reference band from its own wedge start sweeps the share it held on the other ring; the sentence under the control gives both shares, both values, the factor and the rank it moved through.",
        parameter: "which part is followed from one ring to the other",
        authorPicked: "none",
        readerPicks: ["none", ...levels.options.map((o) => levelSlugOf(o.key))],
        heldStill: [".chart-header", ".chart-source"],
      },
      {
        question: "A share of what, exactly?",
        gesture: "ask-a-mark",
        changes: "Each wedge, the remainder included, answers with its part, its share on that ring, the value behind it and what the same part held on the other ring.",
        parameter: "which wedge is asked about",
        authorPicked: subject.name,
        readerPicks: "every mark",
        heldStill: [".chart-header", ".chart-source"],
      },
    ],
  };

  const facts = beatFacts(order.map((p) => ({ key: p.code, label: p.name, value: (p.after / beat.wholeAfter) * 100 })), { subject: subject.name, declaredSequence: plain(beat.unit ?? "%") });
  applicableTreatments(facts);

  const textPerRegister = {
    display: title,
    eyebrow,
    body: `${caveat} ${reading} ${source} ${levels.label} ${levels.noneLabel} ${levels.options.map((o) => `${o.label} ${o.note} ${o.announce}`).join(" ")}`,
    axis: `${RING[0].label} ${RING[1].label} ${order.map((p) => p.name).join(" ")} ${restName}`,
    annot: `${centreNote.join(" ")} ${levels.options.map((o) => o.label).join(" ")}`,
    value: order.map((p) => plain(beat.formatShare((p.after / beat.wholeAfter) * 100))).join(" "),
  };

  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  await renderBeatWeb({
    here: HERE,
    textPerRegister,
    evidenceLevels: beat.evidenceLevels ?? 3,
    async render({ label, direction, outDir }) {
      // FOUR TONES, AS THE WORKED EXAMPLE DRAWS THEM — subject, counterpart, the other named parts,
      // the remainder — when four separable tones of the accent exist above the non-text floor on this
      // ground. When they do not (a white ground under an accent near 5.4:1 has room for three), the
      // remainder shares the other named parts' tone and the legend row says so; the claim's two
      // parts keep their own tones. The component's own assertRampIsSeparable still decides.
      let tones = 4;
      try {
        assertRampIsSeparable(rampForTones(direction.ground, direction.accent, 4), direction.ground, { adjacentMin: 1.25 });
      } catch {
        tones = 3;
      }
      const toneOf = (key) => (key === subject.code ? 0 : key === counterpart.code ? 1 : key === REST ? tones - 1 : 2);
      const members = [...order.map((p) => ({ key: p.code, name: p.name })), { key: REST, name: restName }];
      const legend = Array.from({ length: tones }, (_, tone) => ({ tone, members: members.filter((m) => toneOf(m.key) === tone) })).filter((row) => row.members.length);
      return renderWeb({
        lang,
        component: DirectedDonutWeb,
        props: {
          wedges: wedges.map((w) => ({ ...w, tone: legend.findIndex((row) => row.members.some((m) => m.key === w.key)) })),
          rings: RING.map((r) => ({ key: r.key, label: r.label, total: String(r.world), inner: r.inner, outer: r.outer })),
          legend: legend.map((row, i) => ({ ...row, tone: i })),
          levels,
          interaction,
          title,
          eyebrow,
          caveat,
          source,
          reading,
          centreNote,
          alt,
          direction,
          ground: direction.ground,
          accent: direction.accent,
          nameValueSeparator: /^fr\b/.test(lang) ? " : " : ": ",
        },
        outDir,
        name: `${label}.html`,
      });
    },
  });
});
