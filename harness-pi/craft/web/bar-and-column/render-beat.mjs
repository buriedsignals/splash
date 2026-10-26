// The generic half of a bar-and-column WEB beat, taken from
// proof/web-bar-top-emitters-2024/render-directions-web.mjs with everything about ITS subject
// removed. The interaction is the worked example's and is not the model's to change: every column
// answers hover/tap/Tab with its share of the whole and how many of the members BELOW it in the full
// ranking must be added to match it, and an "stack against" control lets the reader pick a column
// and watch the columns below it stack beside it until they reach it (CSS only, works without JS).
// This file computes that arithmetic; ./beat.mjs — the one file the model writes — gives the data
// and WORDS every reading. Copied into the beat by the harness; never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { DirectedColumnsWeb } from "./DirectedColumnsWeb.tsx";
import { applyStoryboard, assertNumbers, assertLegibleLabels, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { chartWeb, plain, refusing, renderBeatWeb, storyLanguage } from "./web.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderWeb } = await import(chartWeb(HERE, "scripts", "render-web.mjs"));

  const REQUIRED = ["eyebrow", "rows", "subject", "whole", "unit", "format", "detail", "stackLabel", "noneLabel", "announce", "note", "total", "title", "limits", "reading", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")} (see CONTRACT.md)`);
  for (const fn of ["format", "detail", "announce", "note", "total", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);

  // ── the ranking: every member, so "how many below it" is asked of the whole list, not the drawn head
  assertNumbers(beat.rows.map((r) => [r.name, r.value]));
  const ranked = [...beat.rows].sort((a, b) => b.value - a.value).map((r, i) => ({ key: `r${i + 1}`, name: String(r.name), value: r.value }));
  const names = new Set(ranked.map((r) => r.name));
  if (names.size !== ranked.length) throw new Error(`rows holds the same name twice: give each row ONE value (filter data.json to one year / one series)`);
  const DRAWN = beat.drawCount ?? 10;
  if (!(Number.isInteger(DRAWN) && DRAWN >= 3 && DRAWN <= 16)) throw new Error(`drawCount is ${beat.drawCount}: draw between 3 and 16 columns`);
  if (ranked.length < DRAWN) throw new Error(`rows has ${ranked.length} members, fewer than the ${DRAWN} columns drawn: lower drawCount`);
  const drawn = ranked.slice(0, DRAWN);
  const subject = drawn.find((r) => r.name === beat.subject);
  if (!subject) throw new Error(`subject ${JSON.stringify(beat.subject)} is not among the ${DRAWN} columns drawn (${drawn.map((r) => r.name).join(", ")})`);
  const partsSum = ranked.reduce((s, r) => s + r.value, 0);
  if (!(beat.whole > 0) || partsSum > beat.whole * 1.001)
    throw new Error(`whole is ${beat.whole}, but the rows add up to ${partsSum}: whole must be the total the rows are parts of (e.g. the world row, or the sum of every row)`);

  assertLegibleLabels(drawn.map((r) => r.value), beat.format);
  beat.check();
  assertDrawsClaimColumn(drawn.map((r) => r.value), HERE);

  /** The fewest members BELOW this rank whose sum reaches it, and the most whose sum stays under it. */
  function followers(index) {
    let sum = 0;
    let under = 0;
    let underSum = 0;
    for (let i = index + 1; i < ranked.length; i += 1) {
      sum += ranked[i].value;
      if (sum >= ranked[index].value) return { followers: i - index, followersSum: sum, under, underSum };
      under += 1;
      underSum = sum;
    }
    return { followers: null, followersSum: sum, under, underSum };
  }

  const columns = drawn.map((r, i) => {
    const f = followers(i);
    if (f.followers === null)
      throw new Error(`no run of members below ${r.name} adds up to its ${beat.format(r.value)}, so its reading has no answer: draw fewer columns (drawCount) or give rows the whole ranking`);
    const reading = { name: r.name, value: r.value, rank: i + 1, share: (r.value / beat.whole) * 100, ...f };
    return { ...reading, code: r.key, gt: r.value, label: plain(beat.format(r.value)), detail: plain(beat.detail(reading)) };
  });
  const subjectColumn = columns.find((c) => c.name === subject.name);
  // The title may state the subject's own run ("more than the next five together") — a figure the
  // gesture computes about the subject, so it counts as drawn beside the values.
  assertHeadlineNumbersDrawn([beat.title].flat()[0], [...drawn.map((r) => r.value), subjectColumn.under, subjectColumn.followers], "columns");

  // ── the control: a rank is offered only when its whole run is on the plate ──────────────────────
  const stackOptions = [];
  columns.forEach((c, i) => {
    const last = i + c.followers;
    if (last > columns.length - 1) return;
    const words = { name: c.name, value: c.value, followers: c.followers, followersSum: c.followersSum };
    const option = {
      key: c.code,
      label: c.name,
      announce: plain(beat.announce(words)),
      note: plain(beat.note(words)),
      total: plain(beat.total(words)),
      totalGt: c.followersSum,
      onto: columns.slice(i + 1, last + 1).map((x) => x.code),
    };
    const sum = plain(beat.format(c.followersSum));
    for (const field of ["note", "total"])
      if (!option[field].includes(sum))
        throw new Error(`${field}() is printed for the run stacked against ${c.name}, so it must state that run's sum, format(followersSum) = "${sum}"; it says: ${option[field]}`);
    if (!option.announce.includes(c.name)) throw new Error(`announce() must contain the column's name (${c.name}); it says: ${option.announce}`);
    stackOptions.push(option);
  });
  if (stackOptions.length < 2)
    throw new Error(`only ${stackOptions.length} of the ${DRAWN} columns have their whole run of followers on the plate, so the stack control would be a choice of one: raise drawCount`);
  const stackPlan = { label: plain(beat.stackLabel), noneLabel: plain(beat.noneLabel), options: stackOptions };

  const title = plain([beat.title].flat()[0]);
  const caveat = plain([beat.limits].flat()[0]);
  const source = plain(beat.source);
  const reading = plain(beat.reading);
  const eyebrow = plain(beat.eyebrow);
  const unit = plain(beat.unit);
  const alt = plain(typeof beat.alt === "function" ? beat.alt(columns) : beat.alt);

  const facts = beatFacts(columns.map((c) => ({ key: c.code, label: c.name, value: c.gt })), { subject: subject.name, declaredSequence: unit });
  applicableTreatments(facts);

  const textPerRegister = {
    display: title,
    eyebrow,
    body: `${caveat} ${reading} ${source} ${stackPlan.label} ${stackPlan.noneLabel} ${stackOptions.map((o) => `${o.label} ${o.announce} ${o.note}`).join(" ")}`,
    axis: columns.map((c) => c.name).join(" "),
    annot: `${stackPlan.label} ${stackPlan.noneLabel} ${stackOptions.map((o) => o.note).join(" ")}`,
    value: [...columns.map((c) => c.label), ...stackOptions.map((o) => o.total)].join(" "),
  };

  // The interaction, declared as the worked example declares it; renderWeb holds it against the markup.
  const interaction = {
    earns:
      `A still of this ranking prints ${DRAWN} numbers and one fixed comparison. It cannot say what any column is worth against the whole, ` +
      `nor run the headline's arithmetic on any rank but the subject; here the reader picks the reference among ${stackOptions.length} ranks ` +
      `and watches the columns below it stack up against it, from the full ${ranked.length}-member ranking.`,
    controls: [
      {
        question: "What is this column worth against the whole, and how many members below it must be added to match it?",
        gesture: "ask-a-mark",
        changes: "The column steps one shade deeper and the answer box prints its share of the whole and the count of members below it needed to match it.",
        parameter: "which column is asked about",
        authorPicked: subject.name,
        readerPicks: "every mark",
        heldStill: [".chart-header", ".chart-source"],
      },
      {
        question: "If I ask the same of another column, how many below it does it take, and what does that look like?",
        gesture: "toggle-a-comparison",
        changes: "The columns below the chosen one leave their bands and stack beside it until the tower reaches it; the tower's sum stands at its top and one sentence states the count.",
        parameter: "the column the followers are stacked against",
        authorPicked: "none",
        readerPicks: ["none", ...stackOptions.map((o) => o.key.toLowerCase())],
        heldStill: [".chart-header", ".chart-source"],
      },
    ],
  };

  // The worked example's runner also patched the inlined interaction script so a touch's answer
  // survives the finger lifting. The format's interaction.mjs now does that itself
  // (clearUnlessTouch), and the proof's anchored patch would throw on it, so the kit carries none.

  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  await renderBeatWeb({
    here: HERE,
    textPerRegister,
    evidenceLevels: beat.evidenceLevels ?? 2,
    async render({ label, direction, outDir }) {
      const { outPath } = await renderWeb({
        lang,
        component: DirectedColumnsWeb,
        props: {
          columns,
          interaction,
          subject: subjectColumn.code,
          stackPlan,
          // The scale's top holds the tallest tower the control can build, not only the leader.
          top: Math.max(columns[0].gt, ...stackOptions.map((o) => o.totalGt)),
          title,
          eyebrow,
          caveat,
          source,
          unit,
          reading,
          alt,
          direction,
          ground: direction.ground,
          accent: direction.accent,
          nameValueSeparator: /^fr\b/.test(lang) ? " : " : ": ",
        },
        outDir,
        name: `${label}.html`,
      });
      return { outPath };
    },
  });
});
