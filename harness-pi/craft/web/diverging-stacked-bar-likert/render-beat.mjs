// The generic half of a diverging-stacked-bar WEB beat, taken from
// proof/web-diverging-stacked-electricity/render-directions-web.mjs with everything about ITS subject
// removed. The interaction is the worked example's and is not the model's to change: each row is a
// whole (100 %) laid on a FIVE-rung ordered scale and leaned about a fixed centre, and the CUT — where
// the boundary between the two camps falls on that scale — is what the reader operates. Every rung
// keeps its share and changes side; the two camp totals rewrite in the gutters, each row's net marker
// slides, the two camps are named, and a sentence says what the new cut overturns. Every band answers
// hover/tap/Tab. CSS only, works without JS. This file computes the leans under every cut, the
// totals and every band's camp; ./beat.mjs — the one file the model writes — gives the shares and
// WORDS every reading. Copied into the beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { readFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { webRegisters } from "#shared/design-base/web.mjs";
import { DirectedDivergingStackedWeb, FRAME } from "./DirectedDivergingStackedWeb.tsx";
import { applyStoryboard, assertNumbers, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { chartWeb, plain, refusing, renderBeatWeb, storyLanguage } from "./web.mjs";

const LEVEL_KEYS = ["l1", "l2", "l3", "l4", "l5"];

const HERE = dirname(fileURLToPath(import.meta.url));
await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderWeb } = await import(chartWeb(HERE, "scripts", "render-web.mjs"));
  const { deriveFurniture, measureText } = await import(chartWeb(HERE, "scripts", "render-still.mjs"));
  const { labelBoxPx } = await import(chartWeb(HERE, "assets", "keyed-note.ts"));
  const { assertOneCut } = await import(chartWeb(HERE, "assets", "side.ts"));

  const REQUIRED = ["eyebrow", "levels", "rows", "subject", "cutLabel", "cuts", "format", "detail", "netLegend", "title", "limits", "reading", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["format", "detail", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);

  // ── the scale: exactly five rungs (two ink tones, the neutral, two accent tones) ───────────────
  if (!Array.isArray(beat.levels) || beat.levels.length !== 5)
    throw new Error(`levels holds ${beat.levels?.length ?? 0}: this page's scale has exactly FIVE rungs, ordered from one camp's extreme to the other's (two on each side and one in the middle) — group the data's columns into five`);
  const levels = beat.levels.map((l, i) => {
    const label = plain(typeof l === "string" ? l : l?.label ?? "");
    if (!label.trim()) throw new Error(`levels[${i}] has no label`);
    return { key: LEVEL_KEYS[i], label };
  });

  // ── the rows: one whole each, in their own natural order (never re-sorted by result) ───────────
  if (!Array.isArray(beat.rows) || beat.rows.length < 2 || beat.rows.length > 12)
    throw new Error(`rows holds ${beat.rows?.length ?? 0}: a diverging stack compares 2 to 12 rows`);
  for (const r of beat.rows)
    if (!Array.isArray(r.shares) || r.shares.length !== 5) throw new Error(`row ${r.name}: shares must hold five numbers, one per level, in the levels' order`);
  assertNumbers(beat.rows.flatMap((r) => r.shares.map((v, i) => [`${r.name} ${levels[i].label}`, v])), "shares");
  const names = new Set(beat.rows.map((r) => String(r.name)));
  if (names.size !== beat.rows.length) throw new Error(`rows holds the same name twice: one row per name`);
  if (!names.has(String(beat.subject))) throw new Error(`subject ${JSON.stringify(beat.subject)} is not a row's name; the names are ${[...names].join(", ")}`);
  for (const r of beat.rows) {
    if (r.shares.some((v) => v < 0)) throw new Error(`row ${r.name}: a share cannot be negative`);
    const sum = r.shares.reduce((s, v) => s + v, 0);
    if (Math.abs(sum - 100) > 0.5)
      throw new Error(`row ${r.name}: its five shares add up to ${sum.toFixed(2)}, not 100. Draw each level as a share of the row's own total (value / total * 100), and put every column of the row in one of the five levels`);
  }
  for (let i = 0; i < 5; i += 1)
    if (beat.rows.every((r) => !(r.shares[i] > 0))) throw new Error(`level "${levels[i].label}" is zero in every row: a rung nobody has is not on the scale — regroup the columns`);

  beat.check();
  assertDrawsClaimColumn(beat.rows.flatMap((r) => r.shares), HERE);

  // Rounding in the data (99.9, 100.1) is closed here so the five rungs make exactly 100.
  const rows = beat.rows.map((r, i) => {
    const sum = r.shares.reduce((s, v) => s + v, 0);
    return { key: `r${i + 1}`, name: String(r.name), shares: r.shares.map((v) => (v / sum) * 100), isSubject: String(r.name) === String(beat.subject) };
  });
  const subject = rows.find((r) => r.isSubject);

  // ── the cuts: contiguous boundaries on the one scale ─────────────────────────────────────────
  if (!Array.isArray(beat.cuts) || beat.cuts.length < 2 || beat.cuts.length > 5) throw new Error(`cuts holds ${beat.cuts?.length ?? 0}: give 2 to 5 positions of the boundary (the first is the default)`);
  beat.cuts.forEach((cut, i) => {
    if (!Number.isInteger(cut.left) || cut.left < 0 || cut.left > 5) throw new Error(`cuts[${i}].left is ${cut.left}: it counts the levels on the LEFT camp, 0 to 5`);
    if (cut.straddle && cut.left > 4) throw new Error(`cuts[${i}] straddles the level after the ${cut.left} on the left, and there is none`);
    if (!cut.sides?.left || !cut.sides?.right) throw new Error(`cuts[${i}].sides must be { left, right }: the two camps' names under that cut`);
    if (!String(cut.camps ?? "").trim()) throw new Error(`cuts[${i}].camps is empty: one sentence naming the two camps under that cut`);
    if (typeof cut.announce !== "function") throw new Error(`cuts[${i}].announce must be a function of the cut's reading c (see CONTRACT.md)`);
    if (i === 0 && cut.note !== undefined) throw new Error(`cuts[0] is the default picture (the claim the title states) and carries no note: remove cuts[0].note`);
    if (i > 0 && typeof cut.note !== "function") throw new Error(`cuts[${i}].note must be a function of the cut's reading c: the sentence saying what this cut overturns`);
  });

  const leanOf = (cut, r) => {
    let left = 0;
    let right = 0;
    r.shares.forEach((share, index) => {
      if (cut.straddle && index === cut.left) {
        left += share / 2;
        right += share / 2;
      } else if (index < cut.left) left += share;
      else right += share;
    });
    return { row: r.key, name: r.name, left, right, net: right - left, isSubject: r.isSubject };
  };
  const cutReadings = beat.cuts.map((cut, i) => {
    const leans = rows.map((r) => leanOf(cut, r));
    const byNet = [...leans].sort((a, b) => a.net - b.net);
    return {
      cut,
      key: `cut-${i + 1}`,
      reading: {
        label: plain(cut.label),
        leans,
        byName: Object.fromEntries(leans.map((l) => [l.name, l])),
        deepestLeft: byNet[0],
        furthestRight: byNet.at(-1),
        subject: leans.find((l) => l.isSubject),
        rows: rows.map((r) => ({ name: r.name, shares: Object.fromEntries(levels.map((l, j) => [l.label, r.shares[j]])) })),
      },
    };
  });

  assertHeadlineNumbersDrawn(
    [beat.title].flat()[0],
    [...rows.flatMap((r) => r.shares), ...cutReadings.flatMap((c) => c.reading.leans.flatMap((l) => [l.left, l.right, l.net]))],
    "bands",
  );

  const side = {
    label: plain(beat.cutLabel),
    axisMax: 100,
    levels,
    rows: rows.map((r) => r.key),
    shares: rows.flatMap((r) => levels.map((l, j) => ({ row: r.key, level: l.key, share: r.shares[j] }))),
    cuts: cutReadings.map(({ cut, key, reading }, i) => {
      const label = plain(cut.label);
      const announce = plain(cut.announce(reading));
      if (!announce.includes(label)) throw new Error(`cuts[${i}].announce() must contain cuts[${i}].label ("${label}") word for word — a screen reader hears it for that pill; it says: ${announce}`);
      return {
        key,
        label,
        announce,
        ...(i > 0 ? { note: plain(cut.note(reading)) } : {}),
        left: cut.left,
        straddle: cut.straddle ? levels[cut.left].key : null,
        sides: { left: plain(cut.sides.left), right: plain(cut.sides.right) },
        leans: reading.leans.map(({ row, left, right, net }) => ({ row, left, right, net })),
      };
    }),
  };

  // ── what the pointer answers, and what the gutters print ─────────────────────────────────────
  const details = {};
  const totals = {};
  const camps = {};
  for (const { cut, key, reading } of cutReadings) {
    camps[key] = plain(cut.camps);
    for (const lean of reading.leans) {
      totals[`${key}:${lean.row}`] = { left: plain(beat.format(lean.left)), right: plain(beat.format(lean.right)) };
      const r = rows.find((x) => x.key === lean.row);
      levels.forEach((level, index) => {
        const share = r.shares[index];
        if (!(share > 0)) return;
        const camp = cut.straddle && index === cut.left ? "centre" : index < cut.left ? "left" : "right";
        details[`${key}:${r.key}:${level.key}`] = plain(
          beat.detail({ name: r.name, level: level.label, levelIndex: index, share, camp, net: lean.net, left: lean.left, right: lean.right, cut: reading.label, isSubject: r.isSubject }),
        );
      });
    }
  }
  // Within one cut, two bands must not answer alike (across cuts a band that did not move may).
  for (const { key } of cutReadings) {
    const own = Object.entries(details).filter(([k]) => k.startsWith(`${key}:`)).map(([, d]) => d);
    const same = own.find((d, i) => own.indexOf(d) !== i);
    if (same) throw new Error(`detail() gives two bands the same sentence (${JSON.stringify(same)}): name the row and the level in it`);
  }

  const title = plain([beat.title].flat()[0]);
  const caveat = plain([beat.limits].flat()[0]);
  const source = plain(beat.source);
  const reading = plain([beat.reading].flat()[0]);
  const eyebrow = plain(beat.eyebrow);
  const netLegend = plain(beat.netLegend);
  const alt = plain(typeof beat.alt === "function" ? beat.alt(cutReadings.map((c) => c.reading)) : beat.alt);
  const xTicks = [-100, -50, 0, 50, 100];
  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  const tickUnit = /^fr\b/.test(lang) ? " %" : "%";

  const facts = beatFacts(rows.map((r) => ({ key: r.key, label: r.name, value: r.shares[4] })), { subject: subject.name, declaredSequence: "%" });
  applicableTreatments(facts);

  const textPerRegister = {
    display: title,
    eyebrow,
    body: `${caveat} ${reading} ${source}`,
    axis:
      `${xTicks.map((t) => Math.abs(t)).join(" ")}${tickUnit} ${rows.map((r) => r.name).join(" ")} ${levels.map((l) => l.label).join(" ")} ${netLegend} ` +
      `${Object.values(camps).join(" ")} ${side.label} ${side.cuts.map((c) => c.label).join(" ")}`,
    annot: `${side.cuts.map((c) => `${c.announce} ${c.note ?? ""}`).join(" ")} ${Object.values(details).join(" ")} ${alt}`,
    value: Object.values(totals).map((p) => `${p.left} ${p.right}`).join(" "),
  };

  const interaction = {
    earns:
      `The reader moves the boundary between the two camps and watches ${subject.name} go from ${beat.format(cutReadings[0].reading.subject.net)} ` +
      `to every other lean without a single share changing; a still must pick one definition and ask to be trusted.`,
    controls: [
      {
        question: "And if the boundary between the two camps fell somewhere else?",
        gesture: "toggle-a-comparison",
        changes: "Every rung keeps its size and changes camp: the bands cross the centre, the two camp totals rewrite in the gutters, the net marker slides to its new place and a sentence names what the new cut overturns.",
        parameter: "where the boundary between the two camps falls",
        authorPicked: cutReadings[0].key,
        readerPicks: cutReadings.map((c) => c.key),
        heldStill: [".chart-header", ".chart-source"],
      },
      {
        question: "What is in this band?",
        gesture: "ask-a-mark",
        changes: "The band pointed at darkens from its own fill and answers with the row, the rung, its share and the camp this cut puts it in.",
        parameter: "which band is asked about",
        authorPicked: levels[0].label,
        readerPicks: "every mark",
        heldStill: [".chart-header", ".chart-source"],
      },
    ],
  };

  await renderBeatWeb({
    here: HERE,
    textPerRegister,
    evidenceLevels: beat.evidenceLevels ?? 5,
    async render({ label, direction, outDir }) {
      // The y gutter holds the row names (axis register, the subject's bold) and the left totals
      // (value register): the widest of them, plus the shared .axis-label right offset (10 px) and
      // 9 px of slack; never under the worked example's 110.
      const furniture = deriveFurniture(direction.ground);
      const regs = webRegisters(direction, { ink: { ink: furniture.ink, muted: furniture.muted, accent: direction.accent } });
      const widest = Math.max(
        ...rows.map((r) => labelBoxPx(r.name, { ...regs.axis, fontWeight: r.isSubject ? 700 : regs.axis.fontWeight }, measureText, { chip: false }).w),
        ...Object.values(totals).map((p) => labelBoxPx(p.left, regs.value, measureText, { chip: false }).w),
      );
      const yGutterPx = Math.max(FRAME.yGutterPx, Math.ceil(widest + 19));
      // THE CAMPS LINE IS NOT A RESERVED ROW: one line per cut, revealed in place. A cut whose
      // sentence wraps to more lines than another's moves the plot when chosen — measured on the
      // worked example's own page at 375 px ("choosing … does not move the drawing"). Every camps
      // sentence must therefore hold on one line of the phone's content width (375 − 2 × 24 px).
      const PHONE_LINE_PX = 375 - 2 * 24;
      cutReadings.forEach(({ key }, i) => {
        const w = labelBoxPx(camps[key], regs.axis, measureText, { chip: false }).w;
        if (w > PHONE_LINE_PX)
          throw new Error(`cuts[${i}].camps is ${Math.ceil(w)} px wide and wraps on a phone (one line holds ${PHONE_LINE_PX} px), so choosing that cut would move the plot: shorten it — "${camps[key]}"`);
      });
      const { outPath } = await renderWeb({
        lang,
        component: DirectedDivergingStackedWeb,
        props: {
          side,
          rows: rows.map((r) => ({ key: r.key, name: r.name })),
          subject: subject.key,
          details,
          totals,
          camps,
          xTicks,
          netLegend,
          title, eyebrow, caveat, source, reading, alt,
          interaction,
          direction,
          ground: direction.ground,
          accent: direction.accent,
          levelKeys: LEVEL_KEYS,
          yGutterPx,
          tickUnit,
        },
        outDir,
        name: `${label}.html`,
        // The worked example's frame declaration: the type extends (a wider box lengthens every rung
        // without touching a row's height), bounded at the base frame by the layout's arithmetic.
        frame: {
          extends: true,
          base: { width: FRAME.width, height: rows.length * FRAME.row },
          maxRatio: FRAME.width / (rows.length * FRAME.row),
          why:
            "A diverging stacked bar extends: its axis is a continuum of shares and a wider box lengthens every rung without changing a row's height. " +
            "The bound is not this type's legibility but this layout's arithmetic, and at the reference window it is already the base frame.",
        },
      });
      // The refusals only the WRITTEN page can carry (a half-tagged band, a vocabulary that emitted
      // no rules, a blanket hide that landed after the default plate's own reveal).
      assertOneCut(readFileSync(outPath, "utf8"), side, label);
      return { outPath };
    },
  });
});
