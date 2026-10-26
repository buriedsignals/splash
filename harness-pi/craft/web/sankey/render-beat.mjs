// The generic half of a sankey WEB beat, taken from
// proof/web-sankey-electricity-sources/render-directions-web.mjs with everything about ITS subject
// removed. The interaction is the worked example's and is not the model's to change: sources on the
// left, targets on the right, every node printing its own total; a "follow a source" control lights
// one source's whole downstream while the rest recedes, hollows the targets it never reaches, prints
// under each target reached the share of ITS total that source supplies, and writes the path's full
// arithmetic — including what the plate cannot draw (ribbons under half a pixel) — under the control
// (CSS only, works without JS). The first option is the state the page ships in. Every ribbon answers
// hover/tap/Tab with its two ends and its two shares. This file checks conservation, lays out the
// nodes and ribbons, and refuses a source of which the plate draws nothing; ./beat.mjs — the one file
// the model writes — gives the flows and WORDS every reading. Copied into the beat by the harness;
// never edited by the model.
//
// Usage:  bun <beat>/render-beat.mjs
import { readFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { beatFacts, applicableTreatments } from "#shared/chart-beat/treatments.mjs";
import { skillScriptFrom } from "#shared/design-base/skill-script.mjs";
import { DirectedSankeyWeb, FRAME } from "./DirectedSankeyWeb.tsx";
import { applyStoryboard, assertNumbers, assertHeadlineNumbersDrawn, assertDrawsClaimColumn } from "./guards.mjs";
import { chartWeb, plain, refusing, renderBeatWeb, storyLanguage } from "./web.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const GAP = 8;
const MIN_RIBBON = 0.6;
await refusing(HERE, async () => {
  const { default: beat } = await import("./beat.mjs");
  applyStoryboard(beat, HERE);
  const { renderWeb } = await import(chartWeb(HERE, "scripts", "render-web.mjs"));
  const { assertTraceChangesThePicture, assertTraceDeclaration } = await import(skillScriptFrom(HERE, "chart-web", "assets", "trace.ts"));

  const REQUIRED = ["eyebrow", "sources", "targets", "flows", "subject", "nodeLabel", "detail", "traceTitle", "traceLabel", "announce", "stated", "atDestination", "note", "undrawnLabel", "remainder", "title", "limits", "reading", "source", "alt", "check"];
  const missing = REQUIRED.filter((key) => beat[key] === undefined);
  if (missing.length) throw new Error(`beat.mjs is missing ${missing.join(", ")} (see CONTRACT.md)`);
  for (const fn of ["nodeLabel", "detail", "traceLabel", "announce", "stated", "atDestination", "note", "undrawnLabel", "remainder", "check"])
    if (typeof beat[fn] !== "function") throw new Error(`beat.mjs: ${fn} must be a function (see CONTRACT.md)`);

  // ── the two rails and the flows, with conservation computed, never typed ──────────────────────
  const srcKeys = beat.sources.map((s) => String(s.key));
  const tgtKeys = beat.targets.map((t) => String(t.key));
  if (new Set(srcKeys).size !== srcKeys.length) throw new Error(`two sources share a key`);
  if (new Set(tgtKeys).size !== tgtKeys.length) throw new Error(`two targets share a key`);
  if (srcKeys.some((k) => tgtKeys.includes(k))) throw new Error(`a source and a target share the key ${srcKeys.find((k) => tgtKeys.includes(k))}: give the two rails distinct keys`);
  for (const [rail, list] of [["sources", beat.sources], ["targets", beat.targets]])
    if (list.length < 2 || list.length > 12) throw new Error(`${rail} holds ${list.length} nodes; a rail labels 2 to 12 (group the smallest into one computed "other" node and say so in the standfirst)`);
  assertNumbers(beat.flows.map((f) => [`${f.from}→${f.to}`, f.value]), "flow values");
  const pairs = new Set();
  for (const f of beat.flows) {
    if (!srcKeys.includes(String(f.from))) throw new Error(`a flow leaves ${JSON.stringify(f.from)}, which is not a source key (${srcKeys.join(", ")})`);
    if (!tgtKeys.includes(String(f.to))) throw new Error(`a flow reaches ${JSON.stringify(f.to)}, which is not a target key (${tgtKeys.join(", ")})`);
    if (f.value < 0) throw new Error(`the flow ${f.from}→${f.to} is ${f.value}: a ribbon has a width, not a sign — a net change is a diverging bar`);
    const pair = `${f.from}→${f.to}`;
    if (pairs.has(pair)) throw new Error(`two flows for ${pair}: data.json holds several years or series — filter its rows to one`);
    pairs.add(pair);
  }
  const value = (s, t) => beat.flows.find((f) => String(f.from) === s && String(f.to) === t)?.value ?? 0;
  const bySource = beat.sources.map((s) => ({ key: String(s.key), label: plain(s.label), own: s, total: tgtKeys.reduce((sum, t) => sum + value(String(s.key), t), 0) })).sort((a, b) => b.total - a.total);
  const byTarget = beat.targets.map((t) => ({ key: String(t.key), label: plain(t.label), total: srcKeys.reduce((sum, s) => sum + value(s, String(t.key)), 0) })).sort((a, b) => b.total - a.total);
  for (const n of [...bySource, ...byTarget]) if (!(n.total > 0)) throw new Error(`${n.label} has no flow: every node must carry at least one (leave it out of sources/targets)`);
  const grand = bySource.reduce((s, n) => s + n.total, 0);
  const subject = bySource.find((s) => s.key === String(beat.subject));
  if (!subject) throw new Error(`subject ${JSON.stringify(beat.subject)} is not a source key (${srcKeys.join(", ")})`);

  const sourceReading = (s) => ({ key: s.own.key, label: s.label, total: s.total, share: (s.total / grand) * 100, rank: bySource.indexOf(s) + 1 });
  const targetReading = (t) => ({ key: beat.targets.find((x) => String(x.key) === t.key).key, label: t.label, total: t.total, share: (t.total / grand) * 100, rank: byTarget.indexOf(t) + 1 });
  const flowReading = (s, t, v) => ({ from: s.label, to: t.label, value: v, shareOfSource: (v / s.total) * 100, shareOfTarget: (v / t.total) * 100, sourceTotal: s.total, targetTotal: t.total });
  const checkArgs = {
    sources: bySource.map(sourceReading),
    targets: byTarget.map(targetReading),
    flows: bySource.flatMap((s) => byTarget.map((t) => ({ fromKey: s.own.key, toKey: targetReading(t).key, ...flowReading(s, t, value(s.key, t.key)) }))),
    grand,
  };
  beat.check(checkArgs);
  assertDrawsClaimColumn(beat.flows.map((f) => f.value), HERE);
  assertHeadlineNumbersDrawn([beat.title].flat()[0], [...beat.flows.map((f) => f.value), ...bySource.map((s) => s.total), ...byTarget.map((t) => t.total)], "flows");

  // ── geometry, as the worked example lays it out ──────────────────────────────────────────────
  const S = (k) => `x${srcKeys.indexOf(k) + 1}`;
  const T = (k) => `y${tgtKeys.indexOf(k) + 1}`;
  const scale = (FRAME.height - GAP * Math.max(bySource.length, byTarget.length - 1)) / grand;
  const nodes = [];
  const nodeTop = {};
  let cursor = 0;
  for (const s of bySource) {
    const h = s.total * scale;
    nodeTop[S(s.key)] = cursor;
    nodes.push({ key: `s:${S(s.key)}`, ref: S(s.key), name: s.label, side: 0, y: cursor, h, label: plain(beat.nodeLabel({ ...sourceReading(s), side: "source" })) });
    cursor += h + GAP;
  }
  cursor = 0;
  for (const t of byTarget) {
    const h = t.total * scale;
    nodeTop[T(t.key)] = cursor;
    nodes.push({ key: `c:${T(t.key)}`, ref: T(t.key), name: t.label, side: 1, y: cursor, h, label: plain(beat.nodeLabel({ ...targetReading(t), side: "target" })) });
    cursor += h + GAP;
  }

  const ribbons = [];
  const drawn = new Map(bySource.map((s) => [s.key, []]));
  const undrawn = new Map(bySource.map((s) => [s.key, []]));
  const offsetLeft = Object.fromEntries(bySource.map((s) => [s.key, nodeTop[S(s.key)]]));
  const offsetRight = Object.fromEntries(byTarget.map((t) => [t.key, nodeTop[T(t.key)]]));
  let hidden = 0;
  let hiddenTotal = 0;
  for (const s of bySource)
    for (const t of byTarget) {
      const v = value(s.key, t.key);
      const w = v * scale;
      if (w < MIN_RIBBON) {
        if (v > 0) {
          hidden += 1;
          hiddenTotal += v;
          undrawn.get(s.key).push({ t, v });
        }
        continue;
      }
      drawn.get(s.key).push({ t, v });
      ribbons.push({ key: `${S(s.key)}-${T(t.key)}`, flow: S(s.key), from: s.label, to: t.label, y0: offsetLeft[s.key], y1: offsetRight[t.key], w, detail: plain(beat.detail(flowReading(s, t, v))) });
      offsetLeft[s.key] += w;
      offsetRight[t.key] += w;
    }
  if (new Set(ribbons.map((r) => r.detail)).size !== ribbons.length) throw new Error(`two ribbons answer with the same words: detail() must name both ends`);

  // ── the trace: one path per source the plate draws, the subject first ─────────────────────────
  const traceable = bySource.filter((s) => drawn.get(s.key).length > 0);
  const refusedSources = bySource.filter((s) => drawn.get(s.key).length === 0);
  if (!traceable.includes(subject)) throw new Error(`the plate draws no ribbon of the subject ${subject.label} (each is under half a pixel): it cannot be the path the page opens on`);
  if (traceable.length < 2) throw new Error(`only ${traceable.length} source has a ribbon thick enough to draw: following a source would be a choice of one`);
  const ordered = [subject, ...traceable.filter((s) => s !== subject)];
  const traceOption = (s) => {
    const segs = drawn.get(s.key);
    const missed = undrawn.get(s.key);
    const drawnTotal = segs.reduce((t, x) => t + x.v, 0);
    const undrawnTotal = missed.reduce((t, x) => t + x.v, 0);
    const label = plain(beat.traceLabel(sourceReading(s)));
    const o = {
      label,
      name: s.label,
      total: s.total,
      drawnTotal,
      undrawnTotal,
      segments: segs.map((x) => ({ label: x.t.label, value: x.v, shareOfSource: (x.v / s.total) * 100, shareOfTarget: (x.v / x.t.total) * 100 })),
      // Targets that receive NOTHING from this source. The worked example counted every target with no DRAWN
      // ribbon, so its oil sentence said "nothing to Sweden" and then "3.9 TWh undrawn (Sweden…)".
      absent: byTarget.filter((t) => value(s.key, t.key) === 0).map((t) => t.label),
      missed: missed.map((x) => ({ label: x.t.label, value: x.v })),
    };
    const option = {
      key: S(s.key),
      label,
      announce: plain(beat.announce(o)),
      total: s.total,
      undrawn: undrawnTotal,
      undrawnLabel: undrawnTotal > 0 ? plain(beat.undrawnLabel(o)) : null,
      stated: plain(beat.stated(o)),
      segments: segs.map((x, i) => ({ to: T(x.t.key), label: x.t.label, value: x.v, atDestination: plain(beat.atDestination(o.segments[i])) })),
      note: plain(beat.note(o)),
    };
    if (!option.announce.includes(label)) throw new Error(`announce() must contain the pill "${label}" word for word; it says: ${option.announce}`);
    return option;
  };
  const trace = { label: plain(beat.traceTitle), destinations: byTarget.map((t) => T(t.key)), options: ordered.map(traceOption) };
  assertTraceDeclaration(trace, { drawnOrigins: bySource.map((s) => S(s.key)), tolerance: 1e-6 });

  const remainderRaw = hidden > 0 ? beat.remainder({ hidden, hiddenTotal, hiddenShare: (hiddenTotal / grand) * 100, refused: refusedSources.map((s) => ({ label: s.label, total: s.total })) }) : null;
  const remainder = remainderRaw ? plain(remainderRaw) : null;
  if (hidden > 0 && !remainder) throw new Error(`${hidden} flow(s) are too thin to draw at this scale; remainder() must say how many and what they weigh — it returned nothing`);
  if (remainder && !remainder.includes(String(hidden))) throw new Error(`remainder() must state how many flows are not drawn (${hidden}); it says: ${remainder}`);

  const title = plain([beat.title].flat()[0]);
  const caveat = plain([beat.limits].flat()[0]);
  const source = plain(beat.source);
  const reading = plain(beat.reading);
  const eyebrow = plain(beat.eyebrow);
  const alt = plain(typeof beat.alt === "function" ? beat.alt({ ...checkArgs, offered: trace.options.length }) : beat.alt);

  const facts = beatFacts(bySource.map((s) => ({ key: S(s.key), label: s.label, value: s.total })), { subject: subject.label, declaredSequence: plain(beat.unit ?? "value") });
  applicableTreatments(facts);

  const textPerRegister = {
    display: title,
    eyebrow,
    body: `${caveat} ${reading} ${source}`,
    axis: `${nodes.map((n) => n.label).join(" ")} ${trace.options.map((o) => `${o.stated} ${o.segments.map((x) => x.atDestination).join(" ")}`).join(" ")}`,
    annot: `${remainder ?? ""} ${trace.label} ${trace.options.map((o) => `${o.label} ${o.note} ${o.announce} ${o.undrawnLabel ?? ""}`).join(" ")}`,
    value: nodes.map((n) => n.label).join(" "),
  };

  const lang = beat.lang ?? storyLanguage(HERE) ?? "en";
  await renderBeatWeb({
    here: HERE,
    textPerRegister,
    evidenceLevels: beat.evidenceLevels ?? 3,
    async render({ label, direction, outDir }) {
      const out = await renderWeb({
        lang,
        component: DirectedSankeyWeb,
        props: { nodes, ribbons, trace, remainder, title, eyebrow, caveat, source, reading, alt, direction, ground: direction.ground, accent: direction.accent, lowerRecedeToFloor: true },
        outDir,
        name: `${label}.html`,
      });
      // The worked example measures the written page: every path must say something new.
      assertTraceChangesThePicture(readFileSync(out.outPath, "utf8"), trace, `${label}.html`);
      return out;
    },
  });
});
