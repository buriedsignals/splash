/**
 * A Units-family scrolly (histogram or pictogram, prop `variant`) whose staging is the beat's own `gestures`: one row
 * per group of the beat's fixed partition, names in a left column, the group's units — a histogram's bar, a
 * pictogram's squares, one size for every block — and its count after them. Every gesture's marks (the accent, a
 * ring, groups stepping back, a bracket's spine and figure, a compare's copy, a rule at an edge) are laid out in the
 * reader's pixels on each paint by the drive (`applyUnitsState`, gesture-units-scrolly.mjs). What is rendered here
 * for a reader without a script is the closing card's picture: the same groups, their counts, every note written.
 */

import type { CSSProperties } from "react";
import { adjustToContrast, mix, NON_TEXT_CONTRAST_MIN, TEXT_CONTRAST_MIN } from "#shared/chart-beat/colour.mjs";

type Style = Record<string, string | number>;
export type ScrollyGroup = { name: string; count: number; label: string };
export type ScrollyItem = { k: number; do: string; own: number[]; value?: number; members?: number[]; between?: number[]; steps?: string[]; noteText?: string; label?: string };

export function GestureUnitsScrolly({
  variant,
  groups,
  plan,
  notes,
  still,
  max,
  unit,
  alt,
  regs,
  ground,
  accent,
  ink,
  muted,
}: {
  variant: "histogram" | "pictogram-isotype";
  groups: ScrollyGroup[];
  plan: ScrollyItem[];
  /** per gesture, the note its card's header reads ("" for none) */
  notes: string[];
  /** the closing card's picture for the no-JS still: which groups carry the accent */
  still: { accent: boolean[] };
  max: number;
  unit: string;
  alt: string;
  regs: Record<"display" | "eyebrow" | "body" | "axis" | "annot" | "value", Style>;
  ground: string;
  accent: string;
  ink: string;
  muted: string;
}) {
  const accentInk = adjustToContrast(accent, ground, TEXT_CONTRAST_MIN) ?? accent;
  const mutedInk = adjustToContrast(muted, ground, TEXT_CONTRAST_MIN) ?? muted;
  const inkOnGround = adjustToContrast(ink, ground, TEXT_CONTRAST_MIN) ?? ink;
  const neutral = adjustToContrast(mix(ground, ink, 0.42), ground, NON_TEXT_CONTRAST_MIN) ?? mix(ground, ink, 0.55);
  const copyFill = mix(ground, ink, 0.25);
  const halo = `0 0 2px ${ground}, 0 0 3px ${ground}, 0 0 4px ${ground}`;
  const abs = (extra: CSSProperties): CSSProperties => ({ position: "absolute", left: 0, top: 0, whiteSpace: "nowrap", ...extra });
  const noScript = `[data-ugrp] [data-part="stage"] > :not([data-part="still"]) { display: none !important; }` + `[data-ugrp] [data-part="still"] { display: flex !important; }`;
  const writtenNotes = notes.filter((t) => t.trim());
  const slot: CSSProperties = { gridArea: "1 / 1", justifySelf: "end", textAlign: "right" };

  return (
    <div
      role="img"
      aria-label={alt}
      data-ugrp={JSON.stringify({
        variant,
        groups: groups.map((g) => ({ count: g.count })),
        plan: plan.map(({ label: _label, ...p }) => p),
        max,
        colours: { ink: inkOnGround, accentInk, accent, neutral },
      })}
      style={{ position: "absolute", inset: 0, background: ground, display: "grid", gridTemplateRows: "auto minmax(0, 1fr)", gridTemplateColumns: "minmax(0, 1fr)", rowGap: "10px", padding: `12px var(--prose-gutter, clamp(16px, 6vw, 56px))` }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "baseline", gap: "4px 16px" }}>
        <span style={{ ...regs.axis, color: mutedInk, fontWeight: 700 }}>{unit}</span>
        <span style={{ display: "grid", marginLeft: "auto" }}>
          {plan.map((p, j) => (
            <span key={p.k} data-note={p.k} style={{ ...regs.value, ...slot, color: accentInk, opacity: 0 }}>
              {notes[j]}
            </span>
          ))}
        </span>
      </div>
      <noscript style={{ display: "none" }} dangerouslySetInnerHTML={{ __html: `<style>${noScript}</style>` }} />
      <div data-part="stage" style={{ position: "relative", minHeight: 0 }}>
        <div data-part="still" style={{ display: "none", position: "absolute", inset: 0, flexDirection: "column", gap: "8px" }}>
          <div style={{ flex: "1 1 auto", minHeight: 0, display: "grid", gridTemplateColumns: "minmax(0, max-content) minmax(0, 1fr)", gridAutoRows: "minmax(0, 1fr)", alignItems: "center", columnGap: "12px" }}>
            {groups.map((g, i) => {
              const strong = still.accent[i];
              return (
                <div key={i} style={{ display: "contents" }}>
                  <span style={{ ...regs.annot, color: strong ? accentInk : inkOnGround, fontWeight: strong ? 700 : regs.annot.fontWeight, textAlign: "right" }}>{g.name}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    {variant === "histogram" ? (
                      <span style={{ display: "inline-block", width: `${(g.count / Math.max(1, max)) * 82}%`, height: "60%", minHeight: "6px", background: strong ? accent : neutral }} />
                    ) : (
                      <span style={{ display: "flex", flexWrap: "wrap", gap: "2px", maxWidth: "82%" }}>
                        {Array.from({ length: g.count }, (_, k) => (
                          <span key={k} style={{ display: "inline-block", width: "8px", height: "8px", background: strong ? accent : neutral }} />
                        ))}
                      </span>
                    )}
                    <span style={{ ...regs.value, color: strong ? accentInk : inkOnGround, fontWeight: 700 }}>{g.label}</span>
                  </span>
                </div>
              );
            })}
          </div>
          {writtenNotes.length ? <p style={{ ...regs.value, color: accentInk, margin: 0, flex: "0 0 auto" }}>{writtenNotes.join(" · ")}</p> : null}
        </div>

        <svg data-part="field" xmlns="http://www.w3.org/2000/svg" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}>
          {groups.map((g, i) => (
            <g key={i}>
              {variant === "histogram" ? <rect data-bar={i} fill={neutral} /> : Array.from({ length: g.count }, (_, k) => <rect key={k} data-unit={i} fill={neutral} opacity={0} />)}
              <rect data-ring={i} fill="none" stroke={accentInk} strokeWidth={1.5} rx={3} opacity={0} />
            </g>
          ))}
          <line data-part="baseline" stroke={mutedInk} strokeWidth={1} />
          {plan.map((p) =>
            p.do === "compare" ? (
              variant === "histogram" ? (
                <rect key={p.k} data-copy={p.k} fill={copyFill} stroke={inkOnGround} strokeWidth={1} strokeDasharray="3 2" opacity={0} />
              ) : (
                <g key={p.k}>
                  {Array.from({ length: p.value ?? 0 }, (_, k) => (
                    <rect key={k} data-copyu={p.k} fill="none" stroke={inkOnGround} strokeWidth={1} opacity={0} />
                  ))}
                </g>
              )
            ) : p.do === "bracket" ? (
              <path key={p.k} data-spine={p.k} fill="none" stroke={inkOnGround} strokeWidth={1.5} opacity={0} />
            ) : p.do === "reference" ? (
              <line key={p.k} data-rule={p.k} stroke={accentInk} strokeWidth={1.2} strokeDasharray="4 3" opacity={0} />
            ) : null,
          )}
        </svg>

        {groups.map((g, i) => (
          <div key={i}>
            <span data-name={i} style={abs({ ...regs.annot, color: inkOnGround, textAlign: "right", lineHeight: 1.15 })}>
              {g.name}
            </span>
            <span data-value={i} style={abs({ ...regs.value, color: inkOnGround, fontWeight: 700, textShadow: halo })}>
              {g.label}
            </span>
          </div>
        ))}
        {plan
          .filter((p) => p.label !== undefined)
          .map((p) => (
            <span key={p.k} data-label={p.k} style={abs({ ...regs.value, color: p.do === "reference" ? accentInk : inkOnGround, fontWeight: 700, textShadow: halo, opacity: 0 })}>
              {p.label}
            </span>
          ))}
      </div>
    </div>
  );
}
