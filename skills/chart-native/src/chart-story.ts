import { resolveBarSort, specToNativeConfig } from "./spec-to-config";
import type { NarrativeBeat, NativeSpec } from "./spec-to-config";
import { computeChartLayout } from "./chart-geometry";
import type { Dims } from "./chart-geometry";
import { isFrench, localizeDecimal } from "./core/locale";

export const ARC_ROLES = ["establish", "build", "turn", "payoff"] as const;
export type ArcRole = (typeof ARC_ROLES)[number];

// Validate the CLAIM-ARC structure of a beat plan (S2). Roles are OPTIONAL for
// backward compat; but the moment any beat claims a role, the whole plan must form a
// well-formed arc — establish opens, payoff closes, ≥1 build (rising action), ≤1 turn
// (a single Peak — Cohn's E/I/P/R, Amini CHI '15's dominant E+I+PR+), and every role
// beat asserts a non-empty claim (`text`). Pure, throw-free (mirrors narrativeBeatErrors).
export function arcErrors(beats: NarrativeBeat[]): string[] {
  const roled = beats.filter((b) => b.role !== undefined);
  if (roled.length === 0) return []; // legacy anchor-only beats — no arc claimed
  const errs: string[] = [];
  if (roled.length !== beats.length)
    errs.push(
      "claim-arc: every beat must carry a `role` (establish/build/turn/payoff) or NONE — no half-arc",
    );
  beats.forEach((b, i) => {
    if (b.role !== undefined && !ARC_ROLES.includes(b.role))
      errs.push(
        `beat ${i + 1}: role "${b.role}" is not one of ${ARC_ROLES.join("/")}`,
      );
    if (b.role !== undefined && (b.text === undefined || b.text.trim() === ""))
      errs.push(
        `beat ${i + 1} (${b.role}): a claim-arc beat must assert a claim (non-empty \`text\`)`,
      );
  });
  const roles = beats.map((b) => b.role);
  const count = (r: ArcRole) => roles.filter((x) => x === r).length;
  if (roles[0] !== "establish")
    errs.push("claim-arc must OPEN on an `establish` beat (set the scene)");
  if (roles[roles.length - 1] !== "payoff")
    errs.push("claim-arc must CLOSE on a `payoff` beat (land the argument)");
  if (count("build") < 1)
    errs.push(
      "claim-arc needs at least one `build` beat between establish and payoff (the rising action)",
    );
  if (count("establish") > 1)
    errs.push(
      "claim-arc: the scene is set once — more than one `establish` beat",
    );
  if (count("payoff") > 1)
    errs.push(
      "claim-arc: the argument lands once — more than one `payoff` beat",
    );
  if (count("turn") > 1)
    errs.push(
      "claim-arc: a single Peak carries the story — more than one `turn` beat (Cohn E/I/P/R)",
    );
  return errs;
}

// Fixed canvas dims that match LineChart's defaults (width=840, height=480) and the
// minimum right-padding (Math.max(140, labelGutter) where 140 is the floor). Using
// these fixed values keeps deriveChartStory a pure function without needing a rendered
// component — the pixel positions produced are proportionally identical to what the
// chart renders at these defaults, so cumLength fractions are correct.
const CHART_DIMS: Dims = {
  width: 840,
  height: 480,
  padding: { top: 64, right: 140, bottom: 52, left: 56 },
};

export interface ChartBeat {
  kind: "title" | "establish" | "reveal" | "takeaway";
  progress?: number; // line: 0..1 reveal to this point
  highlightIndex?: number; // bar (Slice B)
  labelKey?: string; // scatter (Slice B)
  dataIndex?: number; // line reveal: the data-point index (host resolves the exact
  // path fraction at its OWN responsive width, so the head lands on the point at any size)
  callout: { name: string; value: string; text: string } | null;
  copy: string;
  rank?: number;
  rankRole?: "leader" | "tail";
  role?: ArcRole; // claim-arc stage (S2) — only set when the source beat carried one
}

// Notable points on a line: ALWAYS the first and last, plus the interior points with the
// biggest step-to-step move (the peaks/drops that carry the story). Deterministic; up to 4
// points total so a short scrolly reads. Returns ascending unique indices.
export function lineNotableIndices(ys: number[]): number[] {
  const n = ys.length;
  if (n <= 2) return ys.map((_, i) => i);
  const interior = ys
    .slice(1, -1)
    .map((y, i) => ({ i: i + 1, jump: Math.abs(y - ys[i]) }))
    .sort((a, b) => b.jump - a.jump || a.i - b.i)
    .slice(0, 2)
    .map((c) => c.i);
  return [...new Set([0, ...interior, n - 1])].sort((a, b) => a - b);
}

// Clamp a scroll step index to a valid beat (out-of-range → first/last).
export function mapStepToBeat(beats: ChartBeat[], step: number): ChartBeat {
  const i = Math.max(0, Math.min(beats.length - 1, step));
  return beats[i];
}

// The ranked positions to reveal for a MAGNITUDE chart (bar): the top-3 (leaders) plus
// the tail (the minimum) — a distribution two beats can't carry. Returns, in DISPLAY
// order (desc by value, the order the bar chart sorts into), each revealed row's sorted
// index + 1-based rank + role. The sort MUST match computeBarLayout (bar-geometry.ts):
// value-only, DESC, STABLE — so `sortedIndex` indexes the same bar the chart displays.
// A label tie-break here would silently desync the accent from the caption on tied values.
export function barRankedReveals(
  rows: { label: string; value: number }[],
): { sortedIndex: number; rank: number; role: "leader" | "tail" }[] {
  const desc = [...rows]
    .map((r, i) => ({ ...r, i }))
    .sort((a, b) => b.value - a.value);
  const out: { sortedIndex: number; rank: number; role: "leader" | "tail" }[] =
    desc.slice(0, Math.min(3, desc.length)).map((_, k) => ({
      sortedIndex: k,
      rank: k + 1,
      role: "leader" as const,
    }));
  if (desc.length > out.length)
    out.push({ sortedIndex: desc.length - 1, rank: desc.length, role: "tail" });
  return out;
}

// The notable points to walk on a SCATTER: the outliers that carry a correlation story —
// the extreme x (often the headline outlier), the extreme y, and the opposite y — deduped,
// in a stable order. Up to 3 points so a short scrolly reads.
export function scatterNotableIndices(xs: number[], ys: number[]): number[] {
  const n = xs.length;
  if (n <= 3) return xs.map((_, i) => i);
  const argmax = (a: number[]) =>
    a.reduce((best, v, i) => (v > a[best] ? i : best), 0);
  const argmin = (a: number[]) =>
    a.reduce((best, v, i) => (v < a[best] ? i : best), 0);
  return [...new Set([argmax(xs), argmax(ys), argmin(ys)])];
}

// ---------------------------------------------------------------------------
// Explicit narrative beats — the journalist-confirmed override (spec.beats).
// Default (absent) = the auto-pick above (lineNotableIndices / barRankedReveals),
// byte-identical. When present, the confirmed plan is emitted EXACTLY as given:
// the journalist's narrative order wins, even non-chronological (a line scrolly
// simply scrubs back to an earlier point). An anchor that does not exist in the
// data FAILS LOUD — the same philosophy as dw-chart's annotation-domain tripwire:
// a typo must never silently drop or shift a confirmed beat.
// ---------------------------------------------------------------------------

// How many valid anchor values a fail-loud message lists before truncating —
// enough to spot the typo at a glance, bounded so a 1 000-row CSV cannot flood
// the produce log/report with its whole x column.
const BEAT_ERROR_VALUE_SAMPLE = 20;

function listValidAnchors(values: string[]): string {
  const shown = values.slice(0, BEAT_ERROR_VALUE_SAMPLE);
  const more = values.length - shown.length;
  return shown.join(", ") + (more > 0 ? `, … (+${more} more)` : "");
}

// Validate an explicit beat plan against the chart type + the data's own anchor
// values (line: the x column; bar: the category column). Returns human-readable
// errors ([] = valid). Pure and throw-free so the spine validation gate
// (skills/splash/src/validate-gate.ts) can surface a typo BEFORE production;
// deriveChartStory throws on the same errors at derive time (defense in depth
// for a bypassed gate).
export function narrativeBeatErrors(spec: NativeSpec): string[] {
  const beats = spec.beats;
  if (beats === undefined) return [];
  let parsed: ReturnType<typeof specToNativeConfig>;
  try {
    parsed = specToNativeConfig(spec);
  } catch {
    // A malformed/unmapped spec is the producer validator's report (or the
    // FALLBACK_TO_DW path) — the beat check simply cannot run on it.
    return [];
  }
  if (!Array.isArray(beats)) {
    return [
      "explicit `beats` override must be an ARRAY of beat objects (see NarrativeBeat)",
    ];
  }
  if (beats.length === 0) {
    return [
      "explicit `beats` override is empty — omit the field to use the auto-picked narrative",
    ];
  }
  const { type, config } = parsed;
  if (type !== "line" && type !== "bar") {
    return [
      `explicit \`beats\` override supports line and bar chart scrollies only (got "${type}")`,
    ];
  }
  const errors: string[] = [];
  if (type === "line") {
    const xField = config.xField as string;
    const points = config.points as Record<string, string | number>[];
    const xValues = points.map((p) => String(p[xField]));
    beats.forEach((b, i) => {
      if (b.x === undefined) {
        errors.push(
          `beat ${i + 1}: a line beat must anchor on an \`x\` value from the data`,
        );
        return;
      }
      for (const [field, v] of [
        ["x", b.x],
        ["xEnd", b.xEnd],
      ] as const) {
        if (v === undefined) continue;
        if (!xValues.includes(String(v)))
          errors.push(
            `beat ${i + 1}: ${field} "${v}" not found in the data — valid x values: ${listValidAnchors(xValues)}`,
          );
      }
    });
    return [...errors, ...arcErrors(beats)];
  }
  const catField = config.catField as string;
  const rows = config.rows as Record<string, string | number>[];
  const categories = rows.map((r) => String(r[catField]));
  beats.forEach((b, i) => {
    if (b.category === undefined) {
      errors.push(
        `beat ${i + 1}: a bar walk beat must anchor on a \`category\` value from the data`,
      );
      return;
    }
    if (!categories.includes(b.category))
      errors.push(
        `beat ${i + 1}: category "${b.category}" not found in the data — valid categories: ${listValidAnchors(categories)}`,
      );
  });
  return [...errors, ...arcErrors(beats)];
}

// ADVISORY (never a hard fail) companion to narrativeBeatErrors: for a bars-with-beats
// scrolly, does the chart's RENDERED bar order actually follow the confirmed beat walk?
// The mapper pins config.sort to "none" when beats are present with no explicit sort, so
// after that fix the beat walk advances monotonically through the rendered bars. This
// tripwire makes the OPPOSITE visible: an explicit `sort` that contradicts the beat order
// (bars value-sorted while captions walk a geographic order → the highlight jumps around),
// or a future regression that re-introduces the value-desc default. Returned as a WARNING
// (surfaced at the render gate), not thrown — the journalist may have deliberately paired a
// value sort with a subset walk, and a warning is enough to flag it for review.
// Line beats are anchored by x and a line scrolly may legitimately scrub backwards, so
// only bar walks are checked.
export function narrativeBeatWarnings(spec: NativeSpec): string[] {
  const beats = spec.beats;
  if (!Array.isArray(beats) || beats.length === 0) return [];
  let parsed: ReturnType<typeof specToNativeConfig>;
  try {
    parsed = specToNativeConfig(spec);
  } catch {
    return []; // unmapped/malformed → the producer validator's job, not this check
  }
  const { type, config } = parsed;
  if (type !== "bar") return [];
  const catField = config.catField as string;
  const valField = config.valField as string;
  const rows = config.rows as Record<string, string | number>[];
  const sort = resolveBarSort(spec);
  const ordered =
    sort === "none"
      ? rows
      : [...rows].sort((a, b) => {
          const d = Number(a[valField]) - Number(b[valField]);
          return sort === "asc" ? d : -d;
        });
  const renderIndex = (cat: string) =>
    ordered.findIndex((r) => String(r[catField]) === cat);
  // Positions the beat categories land at in the rendered chart (skip anything not in
  // the data — a typo is narrativeBeatErrors' hard-fail path, not this advisory one).
  const positions = beats
    .map((b) => b.category)
    .filter((c): c is string => typeof c === "string")
    .map(renderIndex)
    .filter((i) => i >= 0);
  const monotonic = positions.every((p, i) => i === 0 || p > positions[i - 1]);
  if (!monotonic)
    return [
      `bar scrolly: the rendered bar order (sort "${sort}") does not follow the explicit ` +
        `narrative beat order — the highlight walk will jump around the chart. Drop the ` +
        `explicit \`sort\` to render bars in the beat order, or reorder the beats to match ` +
        `the value sort.`,
    ];
  return [];
}

// English ordinal: 1st, 2nd, 3rd, 4th…
function ordinalEn(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

// French ordinal, the standard journalistic abbreviation: 1er, 2e, 3e, 4e…
function ordinalFr(n: number): string {
  return n === 1 ? `${n}er` : `${n}e`;
}

// The caption engine's wording must follow the deliverable's language (`spec.lang`,
// threaded from the article by the suggester — see NativeSpec.lang), never hardcode
// English: a French newsroom reading "1st, 2nd, leads, The lowest" is the same class
// of bug as an unlocalized number separator, just in the caption layer instead of the
// axis. Unknown/absent lang falls back to English (matches core/locale's convention).
function ordinal(n: number, lang?: string): string {
  return isFrench(lang) ? ordinalFr(n) : ordinalEn(n);
}

// Build the ordered chart-scrolly beats from a NativeSpec, ADAPTING to the chart type:
//   line    → a progressive DRAW (reveal beats carry a data index; the host scrubs the
//             line on with scroll so the head lands on each captioned point).
//   bar     → a ranked HIGHLIGHT walk (each reveal highlights one bar — leader … tail —
//             carrying its post-sort highlightIndex; the host dims the rest per step).
//   scatter → an outlier HIGHLIGHT walk (each reveal labels one story point by labelKey).
// Every kind emits: title → establish (whole chart) → reveals → takeaway.
export function deriveChartStory(
  spec: NativeSpec,
  insight?: string,
): ChartBeat[] {
  const { type, config } = specToNativeConfig(spec);
  // Explicit journalist-confirmed beats (spec.beats): validated FAIL-LOUD here even
  // when the spine gate was bypassed — a typo'd anchor must never silently drop or
  // shift a confirmed beat. Absent ⇒ the auto-pick below, byte-identical.
  const explicitBeats: NarrativeBeat[] | undefined = spec.beats;
  if (explicitBeats !== undefined) {
    const beatErrors = narrativeBeatErrors(spec);
    if (beatErrors.length)
      throw new Error(
        `invalid explicit narrative beats: ${beatErrors.join("; ")}`,
      );
  }
  // Line + explicit beats: the takeaway closes on the FULL line (all the data — the
  // same semantics as the map takeaway), so it carries the last data index for the
  // scrolly host's card targets. Left undefined on the auto path (byte-identical).
  let takeawayDataIndex: number | undefined;
  // Caption unit = the SHORT callout unit, NOT the long axis label. `unit` is the axis
  // subtitle (e.g. "Share of global CO₂ (%)"); repeating it in every caption is clumsy and
  // duplicates furniture the chart already shows. Prefer an explicit `valueUnit` ("%", "t");
  // else fall back to `unit` ONLY when it is already short (≤4 chars, no spaces, e.g. "t"),
  // otherwise omit it and let the axis carry the meaning. "%" attaches with no space.
  const vu = (spec as { valueUnit?: string }).valueUnit?.trim();
  const uu = spec.unit?.trim();
  const shortUnit = vu || (uu && uu.length <= 4 && !uu.includes(" ") ? uu : "");
  const fmt = (v: number) => {
    const n = Math.round(v * 100) / 100;
    const s = !shortUnit
      ? `${n}`
      : shortUnit === "%"
        ? `${n}%`
        : `${n} ${shortUnit}`;
    return localizeDecimal(s, spec.lang);
  };
  const beats: ChartBeat[] = [
    { kind: "title", callout: null, copy: spec.title },
    { kind: "establish", callout: null, copy: "" },
  ];

  if (type === "line") {
    const xField = config.xField as string;
    const yField = config.yField as string;
    const points = config.points as Record<string, string | number>[];
    const ys = points.map((p) => Number(p[yField]));
    const layout = computeChartLayout(
      {
        xField,
        yField,
        xType: (config.xType as "time" | "linear") ?? "linear",
        points,
      },
      CHART_DIMS,
    );
    const cum = layout.cumLength;
    const total = layout.totalLength || 1;
    if (explicitBeats) {
      // Journalist-confirmed line beats, emitted EXACTLY as given (narrative order
      // wins — a non-chronological plan scrubs the line back). A range beat
      // (x..xEnd) draws to xEnd and captions the span.
      for (const nb of explicitBeats) {
        const anchor = nb.xEnd ?? nb.x;
        const i = points.findIndex((p) => String(p[xField]) === String(anchor));
        if (anchor === undefined || i < 0)
          throw new Error(
            `invalid explicit narrative beats: anchor "${String(anchor)}" not found`,
          ); // unreachable — narrativeBeatErrors already validated above
        const name =
          nb.xEnd !== undefined
            ? `${String(nb.x)}–${String(nb.xEnd)}`
            : String(points[i][xField]);
        const value = fmt(ys[i]);
        const autoCopy = `${name} — ${value}`;
        beats.push({
          kind: "reveal",
          progress: cum[i] / total, // CHART_DIMS fallback; the host prefers dataIndex
          dataIndex: i, // resolved to a path fraction at render width by the host
          ...(nb.role ? { role: nb.role } : {}), // claim-arc stage (S2); no-role path untouched
          callout: { name, value, text: autoCopy },
          // A role beat's `text` is a validated non-empty claim (arcErrors above), so this
          // already picks it verbatim; no-role legacy beats keep the same fallback to autoCopy.
          copy: nb.text?.trim() ? nb.text : autoCopy,
        });
      }
      takeawayDataIndex = points.length - 1; // takeaway = the full line (all the data)
    } else {
      for (const i of lineNotableIndices(ys)) {
        const name = String(points[i][xField]);
        const value = fmt(ys[i]);
        beats.push({
          kind: "reveal",
          progress: cum[i] / total, // CHART_DIMS fallback; the host prefers dataIndex
          dataIndex: i, // resolved to a path fraction at render width by the host
          callout: { name, value, text: `${name} — ${value}` },
          copy: `${name} — ${value}`,
        });
      }
    }
  } else if (type === "bar") {
    const catField = config.catField as string;
    const valField = config.valField as string;
    const rows = config.rows as Record<string, string | number>[];
    const labelled = rows.map((r) => ({
      label: String(r[catField]),
      value: Number(r[valField]),
    }));
    // The chart's ACTUAL display order — driven by the SAME resolved sort the mapper
    // pinned onto config.sort, so `sortedIndex` (== highlightIndex) fetches the row the
    // accented bar shows. When the journalist pinned an explicit narrative beat walk
    // (beats present, no explicit sort → sort "none"), the bars render in data/beat row
    // order, so the story index MUST agree — NOT value-desc (the electrification bug:
    // captions walked the geographic order while the chart re-sorted to value-desc).
    const sort = resolveBarSort(spec);
    const displayOrder =
      sort === "none"
        ? labelled // data/beat row order, matching computeBarLayout's "none"
        : [...labelled].sort((a, b) =>
            sort === "asc" ? a.value - b.value : b.value - a.value,
          );
    // The rank + role that drive the auto-caption wording ("… leads", "The lowest …")
    // stay VALUE-meaningful regardless of the display order: derive them from the value
    // ranking, not the display position, so a beat walk in a non-value order still gets
    // sensible fallback captions when a beat has no text.
    const valueRanked = [...labelled].sort((a, b) => b.value - a.value);
    // The walk: journalist-confirmed categories in the confirmed order (walk length
    // follows the list, not the fixed leaders+tail 4) — or the auto ranked reveals.
    // Explicit entries resolve their category to its DISPLAY index (the same index the
    // chart accents) for the highlight, and to its VALUE rank/role for the wording.
    const walk = explicitBeats
      ? explicitBeats.map((nb) => {
          const sortedIndex = displayOrder.findIndex(
            (row) => row.label === nb.category,
          );
          if (nb.category === undefined || sortedIndex < 0)
            throw new Error(
              `invalid explicit narrative beats: category "${String(nb.category)}" not found`,
            ); // unreachable — narrativeBeatErrors already validated above
          const valueRank = valueRanked.findIndex(
            (row) => row.label === nb.category,
          );
          return {
            sortedIndex,
            rank: valueRank + 1,
            role: (valueRank === valueRanked.length - 1 ? "tail" : "leader") as
              "leader" | "tail",
            text: nb.text,
            arcRole: nb.role, // claim-arc stage (S2); undefined on legacy anchor-only beats
          };
        })
      : barRankedReveals(labelled).map((r) => ({
          ...r,
          text: undefined as string | undefined,
          arcRole: undefined as ArcRole | undefined,
        }));
    // Connective wording is French/English-branched here — same locale as `ordinal`
    // and `fmt` above, sourced from `spec.lang` (never hardcode English for every
    // deliverable language).
    const fr = isFrench(spec.lang);
    for (const r of walk) {
      const row = displayOrder[r.sortedIndex];
      const value = fmt(row.value);
      const autoCopy =
        r.role === "tail"
          ? fr
            ? `Le plus bas — ${row.label}, ${value}`
            : `The lowest — ${row.label}, ${value}`
          : r.rank === 1
            ? fr
              ? `${row.label} en tête — ${value}`
              : `${row.label} leads — ${value}`
            : `${row.label} — ${value}, ${ordinal(r.rank, spec.lang)}`;
      beats.push({
        kind: "reveal",
        highlightIndex: r.sortedIndex,
        rank: r.rank,
        rankRole: r.role,
        ...(r.arcRole ? { role: r.arcRole } : {}), // claim-arc stage (S2); no-role path untouched
        callout: { name: row.label, value, text: `${row.label} — ${value}` },
        // A role beat's `text` is a validated non-empty claim (arcErrors above), so this
        // already picks it verbatim; no-role legacy beats keep the same fallback to autoCopy.
        copy: r.text?.trim() ? r.text : autoCopy,
      });
    }
  } else if (type === "scatter") {
    const xField = config.xField as string;
    const yField = config.yField as string;
    const labelField = (config.labelField as string) ?? xField;
    const rows = config.rows as Record<string, string | number>[];
    const xs = rows.map((r) => Number(r[xField]));
    const ys = rows.map((r) => Number(r[yField]));
    for (const i of scatterNotableIndices(xs, ys)) {
      const name = String(rows[i][labelField]);
      const text = `${name} — ${fmt(xs[i])}, ${fmt(ys[i])}`;
      beats.push({
        kind: "reveal",
        labelKey: name,
        callout: { name, value: fmt(ys[i]), text },
        copy: text,
      });
    }
  } else {
    throw new Error(
      `chart-scrolly supports line, bar, scatter; got "${spec.nativeType}"`,
    );
  }

  beats.push({
    kind: "takeaway",
    // Only set on the explicit-beats line path (spread keeps the auto path
    // byte-identical): the takeaway card draws the line to its LAST data point.
    ...(takeawayDataIndex !== undefined
      ? { dataIndex: takeawayDataIndex }
      : {}),
    callout: null,
    copy: insight && insight !== spec.title ? insight : "",
  });
  return beats;
}
