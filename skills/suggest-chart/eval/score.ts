import { validateChartSpec } from "../../dw-chart/src/chart-spec";
import { validateMapSpec } from "../../map-dw/src/map-spec";
import { validateChoroplethConfig } from "../../map-native/src/validate-config";
import { NATIVE_TYPES } from "../../chart-native/src/native-types";
import { parseCsv } from "../../chart-native/src/csv";
import { validateShape } from "../../chart-native/src/shape-validation";
import { FAMILY_TYPES } from "./family-types";
import { NATIVE_FAMILY_TYPES } from "./native-family-types";
import {
  isFormatAllowed,
  CHANNELS,
  type Channel,
  type VisualFormat,
} from "../../splash/src/channel";
import { isRowDriven, type ChartType } from "../../dw-chart/src/export-aspect";

export interface Score {
  validates: boolean;
  familyMatch: boolean;
  guardrailsOk: boolean;
  pass: boolean;
  notes: string[];
}

export interface Expectation {
  family: string;
  maxWarnings?: number;
  element?: "chart" | "map";
  producer?: "dw-chart" | "chart-native" | "map-dw" | "map-native" | "scrolly";
  // Channel-driven format gate (Slice 1): when set, the spec's implied format
  // (see impliedFormat() below) MUST be in allowedFormats(channel) or the spec
  // fails, regardless of validation/family/warnings — the mechanical half of
  // "not-embed ⇒ never interactive".
  channel?: Channel;
  // Documents the format a case expects. Not separately asserted here — the
  // channel gate above (via impliedFormat) is what's actually checked; this
  // field is for case-authoring clarity and future consumers.
  format?: VisualFormat;
  // UNIT EMISSION gate (QA Wave 10, Italian case): the article measured mm of
  // rainfall, the journalist explicitly wanted the hover to show the exact
  // millimetres — and ② emitted `unit: undefined`, so map-dw's (working)
  // tooltip-unit mechanism had nothing to append. When the case's intent
  // measures a quantity with a short unit (mm, %, €, t, hab.), set this: the
  // emitted map spec must carry a non-blank `unit` (both map-dw MapSpec and
  // map-native configs have the field) or the case fails.
  requireUnit?: boolean;
}

// Derives the format a spec implies, for the channel gate. Prefers an explicit
// `format` field ON THE SPEC ITSELF (e.g. a chart-native config rendered as
// video, which the producer discriminator alone can't distinguish from
// interactive) over the producer→format default mapping below.
export function impliedFormat(spec: unknown): VisualFormat {
  const s =
    spec && typeof spec === "object" ? (spec as Record<string, unknown>) : null;
  const explicit = s?.["format"];
  if (
    explicit === "static" ||
    explicit === "interactive" ||
    explicit === "video" ||
    explicit === "scrolly"
  ) {
    return explicit;
  }
  const producer = s?.["producer"];
  if (producer === "scrolly") return "scrolly";
  if (producer === "chart-native" || producer === "map-native")
    return "interactive";
  // dw-chart / map-dw, or a legacy ChartSpec with no `producer` field at all.
  return "static";
}

// Gates an already-computed Score on two channel-driven checks: (1) a spec whose
// implied format is not in allowedFormats(expect.channel) can never pass; (2) for a
// portrait or square channel, a row-driven horizontal type (isRowDriven, already
// importable from dw-chart's export-aspect.ts) can never pass either — those types
// grow with row count and can't be composed into a vertical/square media box. Both
// ARE mechanically derivable — the type lives on spec.type, the channel's aspect on
// CHANNELS[expect.channel].aspect — so both are checked here (see the SKILL.md
// "Aspect↔type guard" rule for the human-facing framing of check (2)).
function withChannelGate(score: Score, channelOk: boolean): Score {
  if (channelOk) return score;
  return { ...score, guardrailsOk: false, pass: false };
}

// Deterministic gate for a ②-emitted spec. The no-chart case (expect.family === "none")
// is scored apart: pass iff ② emitted { decision: "no-chart" }.
export function scoreSpec(spec: unknown, expect: Expectation): Score {
  const notes: string[] = [];

  if (expect.family === "none") {
    const isNoChart =
      !!spec &&
      typeof spec === "object" &&
      (spec as Record<string, unknown>).decision === "no-chart";
    if (!isNoChart)
      notes.push("expected a no-chart decision, got a chart spec");
    return {
      validates: isNoChart,
      familyMatch: isNoChart,
      guardrailsOk: isNoChart,
      pass: isNoChart,
      notes,
    };
  }

  const producer = (spec as Record<string, unknown> | null)?.["producer"];
  // Both map producers always emit `producer` — discriminate on it explicitly
  // (a stray `basemap` field on a chart spec must not be misclassified as a map).
  const isMap =
    producer === "map-dw" ||
    producer === "map-native" ||
    producer === "scrolly";
  const wantMap = expect.element === "map";

  if (wantMap !== isMap) {
    notes.push(
      wantMap
        ? "expected a map, got a chart — the spatial pattern is the story (Gate 5)"
        : "expected a chart, got a map — ranking/magnitude should stay bars (Gate 5)",
    );
    return {
      validates: false,
      familyMatch: false,
      guardrailsOk: false,
      pass: false,
      notes,
    };
  }

  let channelOk = true;
  if (expect.channel) {
    const fmt = impliedFormat(spec);
    channelOk = isFormatAllowed(expect.channel, fmt);
    if (!channelOk) {
      notes.push(`format '${fmt}' not allowed on channel '${expect.channel}'`);
    }
    // Aspect↔type guard: a portrait/square channel can never host a row-driven
    // horizontal type (d3-bars, dot/arrow/range plots) — those grow with row count
    // and can't be composed into a vertical/square media box (see export-aspect.ts).
    const aspect = CHANNELS[expect.channel].aspect;
    if (aspect === "portrait" || aspect === "square") {
      const specType = (spec as Record<string, unknown> | null)?.["type"];
      if (typeof specType === "string" && isRowDriven(specType as ChartType)) {
        channelOk = false;
        notes.push(
          `row-driven type '${specType}' cannot take a portrait/square channel — route to a column`,
        );
      }
    }
  }

  if (isMap) {
    if (expect.producer && producer !== expect.producer) {
      notes.push(
        `expected producer "${expect.producer}", got "${producer ?? "(none)"}"`,
      );
      return {
        validates: false,
        familyMatch: false,
        guardrailsOk: false,
        pass: false,
        notes,
      };
    }
    const isNative = producer === "map-native" || producer === "scrolly";
    const v = isNative ? validateChoroplethConfig(spec) : validateMapSpec(spec);
    if (!v.ok) notes.push(...v.errors);
    const warns = v.ok ? v.warnings.length : Infinity;
    let guardrailsOk = warns <= (expect.maxWarnings ?? 0);
    if (!guardrailsOk)
      notes.push(`map: ${warns} warnings > ${expect.maxWarnings ?? 0}`);
    // UNIT EMISSION gate (see Expectation.requireUnit): a unit-ful intent must
    // yield a spec whose `unit` is a non-blank string — the unit is part of
    // faithful data representation (it feeds the legend + hover tooltip), not
    // decoration.
    if (expect.requireUnit) {
      const unit = (spec as Record<string, unknown>)["unit"];
      if (typeof unit !== "string" || !unit.trim()) {
        guardrailsOk = false;
        notes.push(
          "the intent measures a quantity with a unit but the emitted spec carries no `unit` — " +
            "emit it (short literal suffix, leading-space semantics per map-dw/src/map-spec.ts)",
        );
      }
    }
    return withChannelGate(
      {
        validates: v.ok,
        familyMatch: true, // a map is its own element; family is geographic by construction
        guardrailsOk,
        pass: v.ok && guardrailsOk,
        notes,
      },
      channelOk,
    );
  }

  if (producer === "chart-native") {
    const s = spec as Record<string, unknown>;
    const nativeType = s["nativeType"];
    const known =
      typeof nativeType === "string" &&
      NATIVE_TYPES.some((e) => e.id === nativeType && !e.deferred);
    if (!known)
      notes.push(
        `nativeType ${String(nativeType)} is not a mapped native type`,
      );
    const title =
      typeof s["title"] === "string" ? (s["title"] as string).trim() : "";
    const src = s["source"] as { name?: string; url?: string } | undefined;
    const hasSource = !!src?.name?.trim(); // url optional (E2 — honest prose sources have none)
    let dataOk = true;
    const data = s["data"];
    if (known && typeof data === "string") {
      try {
        validateShape(nativeType as string, parseCsv(data));
      } catch (e) {
        dataOk = false;
        notes.push((e as Error).message);
      }
    }
    if (!title) notes.push("native spec is missing an insight title");
    if (!hasSource) notes.push("native spec is missing source name");
    const validates = known && !!title && hasSource && dataOk;
    const allowed = NATIVE_FAMILY_TYPES[expect.family] ?? [];
    const familyMatch =
      typeof nativeType === "string" && allowed.includes(nativeType);
    if (!familyMatch)
      notes.push(
        `nativeType ${String(nativeType)} not in native family ${expect.family} [${allowed.join(",")}]`,
      );
    return withChannelGate(
      {
        validates,
        familyMatch,
        guardrailsOk: validates,
        pass: validates && familyMatch,
        notes,
      },
      channelOk,
    );
  }

  const v = validateChartSpec(spec);
  const validates = v.ok;
  if (!v.ok) notes.push("invalid: " + v.errors.join("; "));

  const type =
    spec && typeof spec === "object"
      ? (spec as Record<string, unknown>).type
      : undefined;
  const allowed = FAMILY_TYPES[expect.family] ?? [];
  const familyMatch = typeof type === "string" && allowed.includes(type);
  if (!familyMatch)
    notes.push(
      `type ${type} not in family ${expect.family} [${allowed.join(",")}]`,
    );

  const guardrailsOk = v.ok && v.warnings.length <= (expect.maxWarnings ?? 0);
  if (v.ok && !guardrailsOk) notes.push("warnings: " + v.warnings.join("; "));

  return withChannelGate(
    {
      validates,
      familyMatch,
      guardrailsOk,
      pass: validates && familyMatch && guardrailsOk,
      notes,
    },
    channelOk,
  );
}
