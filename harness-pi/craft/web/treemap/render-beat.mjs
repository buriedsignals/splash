// The generic half of a treemap WEB beat, taken from
// proof/web-treemap-europe-capacity/render-directions-web.mjs with everything about ITS subject
// removed. The interaction is the worked example's and is not the model's to change: the root view
// is one squarified cell per member, its area its total, the thread cells in the accent; every cell
// answers hover/tap/Tab with its share, its rank and what it is made of; and a "descend" control
// lets the reader step into one group — the whole frame is laid out AGAIN over that group alone, so
// members too small to name at the root get the room to be read, and a way back out (CSS only, works
// without JS). This file computes the layouts, the shares and the ranks; ./beat.mjs — the one file
// the model writes — gives the data and WORDS every reading. Copied into the beat by the harness;
// never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { readFile } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { DirectedTreemapWeb, FRAME } from "./DirectedTreemapWeb.tsx";
import { applyStoryboard, assertNumbers, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { chartWeb, plain, refusing, renderBeatWeb, storyLanguage } from "./web.mjs";

/** The worked example's squarified layout, unchanged. */
function squarify(items, x, y, w, h, out = []) {
  if (!items.length) return out;
  const total = items.reduce((s, i) => s + i.value, 0);
  const scale = (w * h) / total;
  const vertical = w >= h;
  const side = vertical ? h : w;
  let row = [];
  let rowSum = 0;
  const worst = (r, sum, len) => {
    if (!r.length) return Number.POSITIVE_INFINITY;
    const max = Math.max(...r.map((i) => i.value)) * scale;
    const min = Math.min(...r.map((i) => i.value)) * scale;
    const s2 = (sum * scale) ** 2;
    return Math.max((len * len * max) / s2, s2 / (len * len * min));
  };
  let rest = [...items];
  while (rest.length) {
    const next = rest[0];
    if (row.length && worst(row, rowSum, side) < worst([...row, next], rowSum + next.value, side)) break;
    row.push(next);
    rowSum += next.value;
    rest = rest.slice(1);
  }
  const thickness = (rowSum * scale) / side;
  let cursor = vertical ? y : x;
  for (const item of row) {
    const length = (item.value * scale) / thickness;
    out.push(vertical ? { ...item, x, y: cursor, w: thickness, h: length } : { ...item, x: cursor, y, w: length, h: thickness });
    cursor += length;
  }
  return vertical ? squarify(rest, x + thickness, y, w - thickness, h, out) : squarify(rest, x, y + thickness, w, h - thickness, out);
}

/** One view's geometry; a layout that lays out fewer cells than it was given has dropped one. */
function layout(items) {
  const laid = squarify(items, 0, 0, FRAME.width, FRAME.height);
  if (laid.length !== items.length) throw new Error(`the layout dropped ${items.length - laid.length} of ${items.length} cells`);
  return laid;
}

const HERE = dirname(fileURLToPath(import.meta.url));
await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderWeb } = await import(chartWeb(HERE, "scripts", "render-web.mjs"));
  const { DESCEND_ROOT_SLUG, assertOneDescent, descendSlugOf } = await import(chartWeb(HERE, "assets", "descend.ts"));

  const REQUIRED = ["eyebrow", "groups", "cells", "format", "detail", "branchDetail", "threadNote", "descendLabel", "rootLabel", "rootAnnounce", "announce", "note", "title", "limits", "reading", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")}: give each as a field of the default export (export default { …, ${missing[0]}: … }), not as a separate export (see CONTRACT.md)`);
  for (const fn of ["format", "detail", "branchDetail", "announce", "note", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);

  // ── the groups and the cells ─────────────────────────────────────────────────────────────────
  if (!Array.isArray(beat.groups) || beat.groups.length < 2) throw new Error(`groups holds ${beat.groups?.length ?? 0} entries; a descent needs at least two groups to step into`);
  if (beat.groups.length > 6) throw new Error(`groups holds ${beat.groups.length} entries; offer at most 6 (merge the smallest)`);
  const groupKeys = beat.groups.map((g) => String(g.key));
  if (new Set(groupKeys).size !== groupKeys.length) throw new Error(`two groups share one key`);
  for (const g of beat.groups) if (typeof g.label !== "string" || !g.label.trim()) throw new Error(`group ${g.key} has no label (the pill's words)`);
  if (!Array.isArray(beat.cells) || beat.cells.length < 3) throw new Error(`cells holds ${beat.cells?.length ?? 0} members; a treemap needs at least three`);
  const names = beat.cells.map((c) => String(c.name));
  if (new Set(names).size !== names.length) throw new Error(`two cells share one name: ADD UP the rows of one member into one cell`);
  const hasCounts = beat.cells.some((c) => c.counts !== undefined);
  for (const c of beat.cells) {
    if (!c.parts || typeof c.parts !== "object") throw new Error(`cell ${c.name} has no parts: give it { name, parts: { <group key>: value }, thread }`);
    const extra = Object.keys(c.parts).filter((k) => !groupKeys.includes(k));
    if (extra.length) throw new Error(`cell ${c.name}'s parts name ${extra.join(", ")}, which is not a group key (${groupKeys.join(", ")})`);
    assertNumbers(groupKeys.map((k) => [`${c.name}.${k}`, c.parts[k] ?? 0]));
    if (groupKeys.some((k) => (c.parts[k] ?? 0) < 0)) throw new Error(`cell ${c.name} holds a negative part: an area cannot be negative`);
    if (hasCounts) {
      if (!c.counts) throw new Error(`cell ${c.name} has no counts while others do: give every cell counts, or none`);
      assertNumbers(groupKeys.map((k) => [`${c.name} count ${k}`, c.counts[k] ?? 0]));
    }
  }
  const part = (c, k) => c.parts[k] ?? 0;
  const cnt = (c, k) => (hasCounts ? (c.counts[k] ?? 0) : 0);
  const rows = beat.cells
    .map((c) => ({ name: String(c.name), parts: c, value: groupKeys.reduce((s, k) => s + part(c, k), 0), sites: hasCounts ? groupKeys.reduce((s, k) => s + cnt(c, k), 0) : null, thread: Boolean(c.thread) }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value)
    .map((r, i) => ({ ...r, key: `c${i + 1}`, rank: i + 1 }));
  if (rows.length < beat.cells.length) console.log(`cells: ${beat.cells.length - rows.length} member(s) with a total of 0 are not drawn`);
  const threads = rows.filter((r) => r.thread);
  if (!threads.length) throw new Error(`no cell has thread: true; the accent marks the cells the takeaway is about`);
  if (threads.length === rows.length) throw new Error(`every cell has thread: true; an accent on everything marks nothing`);

  beat.check();
  assertDrawsClaimColumn(rows.flatMap((r) => groupKeys.map((k) => part(r.parts, k))), HERE);

  const whole = rows.reduce((s, r) => s + r.value, 0);
  const allSites = hasCounts ? rows.reduce((s, r) => s + r.sites, 0) : null;
  const threadWhole = threads.reduce((s, r) => s + r.value, 0);
  const groupLabel = new Map(beat.groups.map((g) => [String(g.key), plain(g.label)]));

  // ── the root view: the claim's own picture ───────────────────────────────────────────────────
  const rootCells = layout(rows.map((r) => ({ ...r }))).map((c) => ({
    key: c.key,
    name: plain(c.name),
    x: c.x, y: c.y, w: c.w, h: c.h,
    tipped: c.thread,
    value: plain(beat.format(c.value)),
    detail: plain(beat.detail({
      name: c.name, value: c.value, share: (c.value / whole) * 100, rank: c.rank, count: rows.length, sites: c.sites, thread: c.thread,
      parts: groupKeys.map((k) => ({ group: groupLabel.get(k), value: part(c.parts, k), share: (part(c.parts, k) / c.value) * 100 })),
    })),
  }));

  // ── one branch per group, laid out AGAIN over the whole frame ─────────────────────────────────
  const branches = beat.groups.map((g, gi) => {
    const k = String(g.key);
    const items = rows.filter((r) => part(r.parts, k) > 0).map((r) => ({ ...r, value: part(r.parts, k), sites: hasCounts ? cnt(r.parts, k) : null })).sort((a, b) => b.value - a.value);
    if (!items.length) throw new Error(`group ${g.label} holds nothing in any cell: leave it out of groups`);
    const total = items.reduce((s, r) => s + r.value, 0);
    const rank = new Map(items.map((r, i) => [r.key, i + 1]));
    const ownTotal = new Map(rows.map((r) => [r.key, r.value]));
    const cells = layout(items).map((c) => ({
      key: c.key,
      name: plain(c.name),
      x: c.x, y: c.y, w: c.w, h: c.h,
      tipped: c.thread,
      value: plain(beat.format(c.value)),
      detail: plain(beat.branchDetail({ name: c.name, group: groupLabel.get(k), value: c.value, rank: rank.get(c.key), count: items.length, share: (c.value / total) * 100, ownShare: (c.value / ownTotal.get(c.key)) * 100, sites: c.sites })),
    }));
    const inThread = items.filter((r) => r.thread);
    const sites = hasCounts ? items.reduce((s, r) => s + r.sites, 0) : null;
    const o = {
      group: groupLabel.get(k),
      value: total,
      count: items.length,
      share: (total / whole) * 100,
      sites,
      sitesShare: hasCounts ? (sites / allSites) * 100 : null,
      leader: { name: items[0].name, share: (items[0].value / total) * 100 },
      threadShare: (inThread.reduce((s, r) => s + r.value, 0) / total) * 100,
      threadCount: threads.length,
    };
    const option = { key: `g${gi + 1}`, label: groupLabel.get(k), announce: plain(beat.announce(o)), note: plain(beat.note(o)), parentShare: total / whole, keys: cells.map((c) => c.key) };
    if (!option.announce.includes(option.label)) throw new Error(`announce() must contain the group's label (${option.label}); it says: ${option.announce}`);
    const stated = plain(beat.format(total));
    if (!option.note.includes(stated)) throw new Error(`note() for ${g.label} must state the group's total, format(o.value) = "${stated}"; it says: ${option.note}`);
    return { slug: descendSlugOf(option.key), cells, option };
  });

  const views = [{ slug: DESCEND_ROOT_SLUG, cells: rootCells }, ...branches.map((b) => ({ slug: b.slug, cells: b.cells }))];
  const rootLabel = plain(beat.rootLabel);
  const descend = {
    label: plain(beat.descendLabel),
    rootLabel,
    rootAnnounce: plain(beat.rootAnnounce),
    rootKeys: rootCells.map((c) => c.key),
    options: branches.map((b) => b.option),
  };

  // The title may state the whole, a group's total or the thread's (e.g. "77 % of the 222 GW").
  assertHeadlineNumbersDrawn([beat.title].flat()[0], [...rows.map((r) => r.value), threadWhole, ...branches.map((b) => b.option.parentShare * whole)], "cells");

  const title = plain([beat.title].flat()[0]);
  const caveat = plain([beat.limits].flat()[0]);
  const source = plain(beat.source);
  const reading = plain([beat.reading].flat()[0]);
  const eyebrow = plain(beat.eyebrow);
  const tippedNote = plain(beat.threadNote);
  const alt = plain(beat.alt);

  const facts = beatFacts(rows.map((r) => ({ key: r.key, label: r.name, value: r.value })), { subject: rows[0].name, declaredSequence: plain(beat.format(whole)) });
  applicableTreatments(facts);

  const textPerRegister = {
    display: title,
    eyebrow,
    body: `${caveat} ${reading} ${source}`,
    axis: [descend.label, descend.rootLabel, ...descend.options.map((o) => o.label)].join(" "),
    annot: `${tippedNote} ${descend.options.map((o) => o.note).join(" ")}`,
    value: views.flatMap((v) => v.cells.map((c) => `${c.name} ${c.value}`)).join(" "),
  };

  await renderBeatWeb({
    here: HERE,
    textPerRegister,
    evidenceLevels: beat.evidenceLevels ?? 3,
    async render({ label, direction, outDir }) {
      const { outPath } = await renderWeb({
        lang: beat.lang ?? storyLanguage(HERE) ?? "en",
        component: DirectedTreemapWeb,
        props: { views, descend, tippedNote, title, eyebrow, caveat, source, reading, alt, direction, ground: direction.ground, accent: direction.accent },
        outDir,
        name: `${label}.html`,
      });
      // The markup, read back, as the worked example's runner does: a half-tagged datum here is a
      // branch's label left over the root's cells.
      assertOneDescent(await readFile(outPath, "utf8"), descend);
      return { outPath };
    },
  });
});
