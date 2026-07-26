// lib/brain/eligibility.ts
// The LEGAL SET. Four conditions, each measurable, each producing a readable reason when it
// excludes. Nothing semantic happens here — the intent never reaches this file, which is what
// guarantees a mis-read intent cannot change what is legal (spec §4.2).
import type { Channel, VisualFormat } from "../core/vocabulary";
import { isFormatAllowed } from "../core/channel-policy";
import type { CapabilityReadiness } from "../newsroom/readiness";
import {
  renderableSheets,
  type RenderableSheet,
  type TypeSheet,
} from "./typology";
import type { Facts } from "./facts";

export type Candidate = {
  id: string;
  engine: string;
  key: string;
  format: VisualFormat;
  sheet: TypeSheet;
  readiness?: { status: CapabilityReadiness["status"]; reason: string };
  requires?: string[];
  /** How full this form is against its own cap, 0..1 (0 when the sheet declares no cap).
   *  Computed here because this is where both the facts and the limits are in hand; the
   *  ranking consumes the number without needing either. */
  fill: number;
};

export type Excluded = { id: string; reason: string };

export type EligibilityInput = {
  facts: Facts;
  channel: Channel;
  /** The decor's capability readiness. Absent ⇒ no CAPACITÉ marking (spec §10). */
  readiness?: CapabilityReadiness[];
  /** The house background. Absent or light ⇒ no style exclusion. */
  themeBg?: string;
  route: "embed" | "article";
};

// The engines whose output is a narrative page rather than an embeddable element. Until the
// article branch exists they are offered MARKED, never dropped (spec §8).
const ARTICLE_BRANCH_ENGINES = new Set(["scrolly", "image-native"]);
const ARTICLE_BRANCH = "article-branch";

export function eligible(
  input: EligibilityInput,
  pairs: RenderableSheet[] = renderableSheets(),
): { eligible: Candidate[]; excluded: Excluded[] } {
  const out: Candidate[] = [];
  const excluded: Excluded[] = [];
  const seenExclusion = new Set<string>();
  const exclude = (id: string, reason: string) => {
    if (seenExclusion.has(id)) return;
    seenExclusion.add(id);
    excluded.push({ id, reason });
  };

  for (const { sheet, engine, key } of pairs) {
    // Channel-format legality is checked before the data limit: it depends only on the
    // sheet's declared formats and the channel, never on the facts, so a form whose EVERY
    // format is off-channel is off-channel regardless of whether the data would also have
    // broken one of its limits — the journalist should read the reason that actually drove
    // the refusal for this channel, not an unrelated data limit that happened to run first.
    const formats = sheet.formats.filter((f) =>
      isFormatAllowed(input.channel, f),
    );
    if (formats.length === 0) {
      exclude(
        sheet.id,
        `the ${input.channel} channel allows none of the formats this form comes in (${sheet.formats.join(", ")})`,
      );
      continue;
    }
    const limit = limitFailure(sheet, input.facts);
    if (limit) {
      exclude(sheet.id, limit);
      continue;
    }
    if (isDark(input.themeBg) && engine === "dw-chart") {
      exclude(
        sheet.id,
        "the house theme has a dark background and Datawrapper only renders on a light one",
      );
      continue;
    }
    const fill = fillRatio(sheet, input.facts);
    for (const format of formats)
      out.push(
        withMarks({ id: sheet.id, engine, key, format, sheet, fill }, input),
      );
  }
  return { eligible: out, excluded };
}

// A limit is only checked when the sheet declares it: an absent limit means "not constrained",
// never zero.
function limitFailure(sheet: TypeSheet, f: Facts): string | null {
  const l = sheet.limits;
  if (l.points != null && f.points !== l.points)
    return `this form needs exactly ${l.points} measured points per row, and the data has ${f.points}`;
  if (l.minPoints != null && f.points < l.minPoints)
    return `this form needs at least ${l.minPoints} points, and the data has ${f.points}`;
  if (l.maxPoints != null && f.points > l.maxPoints)
    return `this form takes at most ${l.maxPoints} points, and the data has ${f.points}`;
  if (l.maxSeries != null && f.series > l.maxSeries)
    return `this form stays readable up to ${l.maxSeries} series, and the data has ${f.series}`;
  if (l.maxCategories != null && f.rows > l.maxCategories)
    return `this form stays readable up to ${l.maxCategories} categories, and the data has ${f.rows}`;
  if (l.minRows != null && f.rows < l.minRows)
    return `this form needs at least ${l.minRows} rows to read as one, and the data has ${f.rows}`;
  return null;
}

// How close a form runs to its own readability cap. A slope carrying 11 of its 12 lines is
// legal and cramped; one carrying 4 is legal and comfortable, and that difference is worth an
// ordering nudge (never a legality one). No cap declared ⇒ 0: an unconstrained form must not
// win a fit it never claimed.
function fillRatio(sheet: TypeSheet, f: Facts): number {
  const cap = sheet.limits.maxSeries ?? sheet.limits.maxCategories;
  if (cap == null || cap <= 0) return 0;
  const used = sheet.limits.maxSeries != null ? f.series : f.rows;
  return Math.min(1, used / cap);
}

// CAPACITÉ and the article branch MARK, they never remove: the worst status among what a form
// requires is the status of the form (the rule already in lib/loop/propose.ts).
const SEVERITY = { ready: 0, unverified: 1, disabled: 2, missing: 3 } as const;

function withMarks(c: Candidate, input: EligibilityInput): Candidate {
  const requires = [
    c.engine,
    ...(ARTICLE_BRANCH_ENGINES.has(c.engine) || c.format === "scrolly"
      ? [ARTICLE_BRANCH]
      : []),
  ];
  const marks: { status: CapabilityReadiness["status"]; reason: string }[] = [];
  if (requires.includes(ARTICLE_BRANCH) && input.route !== "article")
    marks.push({
      status: "missing",
      reason:
        "this is the whole-article branch — it is not built yet, and it changes what gets delivered",
    });
  for (const r of input.readiness ?? [])
    if (requires.includes(r.id) && r.status !== "ready")
      marks.push({ status: r.status, reason: r.reason });
  if (marks.length === 0) return { ...c, requires };
  const worst = marks.reduce((a, b) =>
    SEVERITY[b.status] > SEVERITY[a.status] ? b : a,
  );
  return { ...c, requires, readiness: worst };
}

// The house ground is "light", "dark", or any #rrggbb (skills/splash/src/brand-profile.ts:35).
// Relative luminance against the WCAG mid point — the same split the producers use to pick a
// basemap. A background below it is "dark", and dark is where Datawrapper cannot follow.
function isDark(themeBg?: string): boolean {
  if (!themeBg) return false;
  const t = themeBg.trim();
  if (t === "dark") return true;
  if (t === "light") return false;
  const m = /^#?([0-9a-f]{6})$/i.exec(t);
  if (!m) return false;
  const n = parseInt(m[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.5;
}
