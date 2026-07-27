// status-view.ts — how a readiness status is SHOWN. Shared by the server (which renders the
// summary) and the browser client (which re-renders it after a live check), so the two can never
// disagree about what "degraded" looks like.
//
// The glyph is not decoration: status is never carried by colour alone (WCAG 1.4.1), so every
// pill pairs a hue with a mark and a word.
import type { ReadinessStatus } from "../../lib/newsroom/readiness.ts";

export type StatusTone = "ready" | "missing" | "degraded" | "off";

export type StatusView = {
  tone: StatusTone;
  glyph: string;
  /** One word, in the interface language. */
  label: string;
};

const LABELS: Record<string, Record<StatusTone, string>> = {
  en: {
    ready: "Ready",
    missing: "Missing",
    degraded: "Unverified",
    off: "Off",
  },
  fr: {
    ready: "Prêt",
    missing: "Manquant",
    degraded: "Non vérifié",
    off: "Désactivé",
  },
};

const TONES: Record<ReadinessStatus, { tone: StatusTone; glyph: string }> = {
  ready: { tone: "ready", glyph: "✓" },
  missing: { tone: "missing", glyph: "!" },
  unverified: { tone: "degraded", glyph: "~" },
  disabled: { tone: "off", glyph: "–" },
};

export function statusView(status: ReadinessStatus, lang: string): StatusView {
  const { tone, glyph } = TONES[status];
  const base = (lang || "en").toLowerCase().split("-")[0]!;
  return { tone, glyph, label: (LABELS[base] ?? LABELS.en!)[tone] };
}
